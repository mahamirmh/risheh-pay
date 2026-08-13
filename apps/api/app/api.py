import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import DigitalDelivery, Order, OrderState, Payment, Product, ProductVariant, Quote
from app.payments.mock import MockPaymentProvider
from app.pricing.service import calculate_price
from app.providers.mock import MockDigitalGoodsProvider

router = APIRouter(prefix="/api/v1")
payment_provider = MockPaymentProvider()
goods_provider = MockDigitalGoodsProvider()


class QuoteRequest(BaseModel):
    variant_id: uuid.UUID
    payment_fee_rate: Decimal = Field(default=Decimal("0"), ge=0)
    risk_buffer_rate: Decimal = Field(default=Decimal("0.01"), ge=0)
    margin_rate: Decimal = Field(default=Decimal("0.05"), ge=0)


class CheckoutRequest(BaseModel):
    quote_id: uuid.UUID


@router.get("/products")
async def products(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(
        select(Product, ProductVariant)
        .join(ProductVariant, Product.id == ProductVariant.product_id)
        .where(ProductVariant.enabled.is_(True))
        .order_by(Product.brand, Product.name, ProductVariant.denomination)
    )).all()
    return [
        {
            "id": str(variant.id), "product_id": str(product.id),
            "brand": product.brand, "name": product.name,
            "category": product.category, "country_code": variant.country_code,
            "currency": variant.currency, "denomination": str(variant.denomination),
        }
        for product, variant in rows
    ]


@router.post("/quotes")
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


@router.post("/orders")
async def create_order(payload: CheckoutRequest, db: AsyncSession = Depends(get_db)) -> dict:
    quote = await db.get(Quote, payload.quote_id)
    if not quote or quote.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Quote is missing or expired")
    existing = (await db.execute(select(Order).where(Order.quote_id == quote.id))).scalar_one_or_none()
    if existing:
        return {"id": str(existing.id), "state": existing.state.value, "correlation_id": existing.correlation_id}
    order = Order(quote_id=quote.id, state=OrderState.PAYMENT_PENDING, correlation_id=f"rg-{uuid.uuid4().hex[:20]}")
    db.add(order)
    await db.flush()
    payment = await payment_provider.create_payment(order_id=str(order.id), amount=quote.final_amount, idempotency_key=str(order.id))
    db.add(Payment(order_id=order.id, provider="mock", idempotency_key=str(order.id), provider_reference=payment.reference, amount=quote.final_amount, status=payment.status))
    await db.commit()
    return {"id": str(order.id), "state": order.state.value, "correlation_id": order.correlation_id, "payment_url": payment.checkout_url, "payment_reference": payment.reference, "amount": str(quote.final_amount), "currency": quote.currency}


@router.post("/orders/{order_id}/pay")
async def pay_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    quote = await db.get(Quote, order.quote_id)
    payment = (await db.execute(select(Payment).where(Payment.order_id == order.id))).scalar_one()
    verification = await payment_provider.verify(reference=payment.provider_reference or "", expected_amount=quote.final_amount)
    if verification.status != "paid":
        raise HTTPException(status_code=402, detail="Payment verification failed")
    payment.status = "paid"
    order.state = OrderState.PAID
    purchase = await goods_provider.purchase("mock-apple-us", quote.provider_cost, idempotency_key=str(order.id))
    if purchase.status != "delivered":
        order.state = OrderState.FULFILLMENT_FAILED
        await db.commit()
        raise HTTPException(status_code=502, detail="Fulfillment failed")
    order.state = OrderState.DELIVERED
    db.add(DigitalDelivery(order_id=order.id, encrypted_payload=purchase.delivery_secret or ""))
    await db.commit()
    return {"id": str(order.id), "state": order.state.value, "delivery": purchase.delivery_secret}


@router.get("/orders/{order_id}")
async def get_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    delivery = (await db.execute(select(DigitalDelivery).where(DigitalDelivery.order_id == order.id))).scalar_one_or_none()
    return {"id": str(order.id), "state": order.state.value, "correlation_id": order.correlation_id, "delivery": delivery.encrypted_payload if delivery else None}
