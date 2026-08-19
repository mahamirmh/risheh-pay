import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db, settings
from app.fulfillment.service import fulfill
from app.models import (
    AuditLog,
    DigitalDelivery,
    Order,
    OrderState,
    Payment,
    Product,
    ProductVariant,
    Quote,
)
from app.orders.repository import OrderNotFound, get_order_for_update, transition_order
from app.orders.state_machine import InvalidOrderTransition
from app.payments.mock import MockPaymentProvider
from app.pricing.service import calculate_price
from app.providers.mock import MockDigitalGoodsProvider
from app.refunds.service import recover_payment
from app.security.crypto import (
    DeliveryEncryptionNotConfigured,
    decrypt_delivery_secret,
    encrypt_delivery_secret,
)
from app.security.rate_limit import rate_limit

router = APIRouter(prefix="/api/v1")
payment_provider = MockPaymentProvider()
goods_provider = MockDigitalGoodsProvider()

# Order states in which /pay has already run (successfully or not) and must
# not be re-executed. Calling /pay again on one of these is a no-op that
# returns the current state, so retried client requests (double taps, flaky
# networks) can never double-charge or re-purchase from the provider.
_PAY_ALREADY_HANDLED = frozenset(
    {
        OrderState.PAID,
        OrderState.FULFILLMENT_PENDING,
        OrderState.PROCESSING,
        OrderState.RETRYING,
        OrderState.RECONCILIATION_REQUIRED,
        OrderState.FULFILLMENT_FAILED,
        OrderState.REFUND_PENDING,
        OrderState.REFUNDED,
        OrderState.DELIVERED,
    }
)


class QuoteRequest(BaseModel):
    variant_id: uuid.UUID
    payment_fee_rate: Decimal = Field(default=Decimal("0"), ge=0)
    risk_buffer_rate: Decimal = Field(default=Decimal("0.01"), ge=0)
    margin_rate: Decimal = Field(default=Decimal("0.05"), ge=0)


class CheckoutRequest(BaseModel):
    quote_id: uuid.UUID


@router.get("/products")
async def products(category: str | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    query = (
        select(Product, ProductVariant)
        .join(ProductVariant, Product.id == ProductVariant.product_id)
        .where(ProductVariant.enabled.is_(True))
        .order_by(Product.brand, Product.name, ProductVariant.denomination)
    )
    if category:
        query = query.where(Product.category == category)
    rows = (await db.execute(query)).all()
    return [
        {
            "id": str(variant.id), "product_id": str(product.id),
            "brand": product.brand, "name": product.name,
            "category": product.category, "country_code": variant.country_code,
            "currency": variant.currency, "denomination": str(variant.denomination),
        }
        for product, variant in rows
    ]


@router.get("/categories")
async def categories(db: AsyncSession = Depends(get_db)) -> list[dict]:
    """Distinct categories with an enabled, purchasable variant - powers
    storefront category navigation (PRD: "search/category/brand discovery")."""
    rows = (
        await db.execute(
            select(Product.category, ProductVariant.id)
            .join(ProductVariant, Product.id == ProductVariant.product_id)
            .where(ProductVariant.enabled.is_(True))
        )
    ).all()
    counts: dict[str, int] = {}
    for category, _variant_id in rows:
        counts[category] = counts.get(category, 0) + 1
    return [{"category": category, "product_count": count} for category, count in sorted(counts.items())]


@router.post("/quotes", dependencies=[rate_limit("quotes", limit=30, window_seconds=60)])
async def create_quote(payload: QuoteRequest, db: AsyncSession = Depends(get_db)) -> dict:
    variant = await db.get(ProductVariant, payload.variant_id)
    if not variant or not variant.enabled:
        raise HTTPException(status_code=404, detail="Variant not found")
    provider_cost = await goods_provider.quote_cost("mock-apple-us", variant.denomination)
    breakdown = calculate_price(
        provider_cost=provider_cost, fx_rate=Decimal("100000"),
        payment_fee_rate=payload.payment_fee_rate,
        risk_buffer_rate=payload.risk_buffer_rate, margin_rate=payload.margin_rate,
    )
    quote = Quote(
        variant_id=variant.id, provider_cost=breakdown.provider_cost,
        fx_rate=breakdown.fx_rate, margin_amount=breakdown.margin,
        final_amount=breakdown.final_amount, currency="IRR",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return {"id": str(quote.id), "amount": str(quote.final_amount), "currency": quote.currency, "expires_at": quote.expires_at}


@router.post("/orders", dependencies=[rate_limit("orders", limit=20, window_seconds=60)])
async def create_order(payload: CheckoutRequest, db: AsyncSession = Depends(get_db)) -> dict:
    quote = await db.get(Quote, payload.quote_id)
    if not quote or quote.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Quote is missing or expired")
    existing = (await db.execute(select(Order).where(Order.quote_id == quote.id))).scalar_one_or_none()
    if existing:
        return {"id": str(existing.id), "state": existing.state.value, "correlation_id": existing.correlation_id}
    order = Order(quote_id=quote.id, state=OrderState.PAYMENT_PENDING, correlation_id=f"rg-{uuid.uuid4().hex[:20]}")
    db.add(order)
    try:
        await db.flush()
    except IntegrityError:
        # Two concurrent requests raced on the same quote_id; the unique
        # constraint on orders.quote_id caught it. Return the winner's order
        # instead of surfacing a 500 to the loser.
        await db.rollback()
        existing = (await db.execute(select(Order).where(Order.quote_id == quote.id))).scalar_one_or_none()
        if existing:
            return {"id": str(existing.id), "state": existing.state.value, "correlation_id": existing.correlation_id}
        raise
    payment = await payment_provider.create_payment(order_id=str(order.id), amount=quote.final_amount, idempotency_key=str(order.id))
    db.add(Payment(order_id=order.id, provider="mock", idempotency_key=str(order.id), provider_reference=payment.reference, amount=quote.final_amount, status=payment.status))
    db.add(
        AuditLog(
            correlation_id=order.correlation_id,
            actor="system",
            event="order_created",
            payload={"order_id": str(order.id), "quote_id": str(quote.id), "state": order.state.value},
        )
    )
    await db.commit()
    return {"id": str(order.id), "state": order.state.value, "correlation_id": order.correlation_id, "payment_url": payment.payment_url, "payment_reference": payment.reference, "amount": str(quote.final_amount), "currency": quote.currency}


def _order_response(order: Order, delivery: str | None = None) -> dict:
    return {"id": str(order.id), "state": order.state.value, "correlation_id": order.correlation_id, "delivery": delivery}


@router.post("/orders/{order_id}/pay", dependencies=[rate_limit("pay", limit=10, window_seconds=60)])
async def pay_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    try:
        order = await get_order_for_update(db, order_id)
    except OrderNotFound as exc:
        raise HTTPException(status_code=404, detail="Order not found") from exc

    if order.state in _PAY_ALREADY_HANDLED:
        # Idempotent: a retried/duplicated call must never re-verify payment
        # or re-purchase from the provider. Just report where the order is.
        delivery = (
            await db.execute(select(DigitalDelivery).where(DigitalDelivery.order_id == order.id))
        ).scalar_one_or_none()
        secret = None
        if delivery is not None and order.state == OrderState.DELIVERED:
            secret = _reveal(db, delivery, order, actor="customer")
            await db.commit()
        return _order_response(order, secret)

    if order.state != OrderState.PAYMENT_PENDING:
        raise HTTPException(status_code=409, detail=f"Order is not payable from state {order.state.value}")

    quote = await db.get(Quote, order.quote_id)
    payment = (await db.execute(select(Payment).where(Payment.order_id == order.id))).scalar_one()
    verification = await payment_provider.verify(reference=payment.provider_reference or "", expected_amount=quote.final_amount)
    if verification.status != "paid":
        raise HTTPException(status_code=402, detail="Payment verification failed")
    payment.status = "paid"

    await transition_order(db, order_id=order.id, target=OrderState.PAID, actor="payment_gateway", event="payment_verified")
    await transition_order(db, order_id=order.id, target=OrderState.FULFILLMENT_PENDING, actor="system", event="fulfillment_enqueued")
    await transition_order(db, order_id=order.id, target=OrderState.PROCESSING, actor="system", event="fulfillment_started")

    decision = await fulfill(
        provider=goods_provider,
        external_product_id="mock-apple-us",
        amount=quote.provider_cost,
        idempotency_key=f"fulfill:{order.id}",
    )

    try:
        order = await transition_order(db, order_id=order.id, target=decision.state, actor="system", event="fulfillment_decision")
    except InvalidOrderTransition as exc:
        raise HTTPException(status_code=500, detail="Unexpected fulfillment outcome") from exc

    secret: str | None = None
    if decision.state == OrderState.DELIVERED and decision.purchase and decision.purchase.delivery_secret:
        encrypted = encrypt_delivery_secret(decision.purchase.delivery_secret, key=settings.delivery_encryption_key)
        delivery = DigitalDelivery(order_id=order.id, encrypted_payload=encrypted)
        db.add(delivery)
        await db.flush()
        secret = _reveal(db, delivery, order, actor="customer")
    elif decision.state == OrderState.FULFILLMENT_FAILED:
        # Money was taken but the provider could not deliver: recover it
        # automatically instead of leaving a paid, undelivered order stuck.
        refund = await recover_payment(
            payment_provider=payment_provider,
            payment_reference=payment.provider_reference or "",
            amount=payment.amount,
            order_id=str(order.id),
        )
        order = await transition_order(db, order_id=order.id, target=OrderState.REFUND_PENDING, actor="system", event="refund_initiated")
        order = await transition_order(
            db, order_id=order.id, target=OrderState.REFUNDED, actor="payment_gateway", event="refund_confirmed"
        )
        db.add(
            AuditLog(
                correlation_id=order.correlation_id,
                actor="system",
                event="refund_completed",
                payload={"order_id": str(order.id), "refund_reference": refund.reference, "reason": decision.reason},
            )
        )

    await db.commit()
    return _order_response(order, secret)


def _reveal(db: AsyncSession, delivery: DigitalDelivery, order: Order, *, actor: str) -> str:
    """Decrypt a delivery secret for an authorized read and audit the reveal
    (SECURITY.md: "Audit code reveal/access events")."""
    try:
        secret = decrypt_delivery_secret(delivery.encrypted_payload, key=settings.delivery_encryption_key)
    except (DeliveryEncryptionNotConfigured, ValueError) as exc:
        raise HTTPException(status_code=500, detail="Delivery could not be decrypted") from exc
    db.add(
        AuditLog(
            correlation_id=order.correlation_id,
            actor=actor,
            event="delivery_revealed",
            payload={"order_id": str(order.id)},
        )
    )
    return secret


@router.get("/orders/{order_id}", dependencies=[rate_limit("order_read", limit=60, window_seconds=60)])
async def get_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    delivery = (await db.execute(select(DigitalDelivery).where(DigitalDelivery.order_id == order.id))).scalar_one_or_none()
    secret = None
    if delivery is not None and order.state == OrderState.DELIVERED:
        secret = _reveal(db, delivery, order, actor="customer")
        await db.commit()
    return _order_response(order, secret)
