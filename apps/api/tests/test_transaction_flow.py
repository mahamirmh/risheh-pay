from decimal import Decimal

import pytest

from app.checkout.preflight import PreflightRejected, create_preflight_quote
from app.fulfillment.service import fulfill
from app.models import OrderState
from app.payments.mock import MockPaymentProvider
from app.providers.mock import MockDigitalGoodsProvider


class TimeoutProvider(MockDigitalGoodsProvider):
    async def purchase(self, external_product_id, amount, *, idempotency_key):
        raise TimeoutError("simulated provider timeout after request")


@pytest.mark.asyncio
async def test_preflight_rejects_unavailable_denomination() -> None:
    with pytest.raises(PreflightRejected):
        await create_preflight_quote(
            provider=MockDigitalGoodsProvider(),
            external_product_id="mock-apple-us",
            denomination=Decimal("999"),
            fx_rate=Decimal("100000"),
        )


@pytest.mark.asyncio
async def test_duplicate_payment_creation_is_idempotent() -> None:
    provider = MockPaymentProvider()
    first = await provider.create_payment(
        order_id="order-1", amount=Decimal("2675000"), idempotency_key="payment-order-1"
    )
    second = await provider.create_payment(
        order_id="order-1", amount=Decimal("2675000"), idempotency_key="payment-order-1"
    )
    assert first.reference == second.reference


@pytest.mark.asyncio
async def test_payment_verification_rejects_amount_mismatch() -> None:
    provider = MockPaymentProvider()
    intent = await provider.create_payment(
        order_id="order-1", amount=Decimal("2675000"), idempotency_key="payment-order-1"
    )
    result = await provider.verify(reference=intent.reference, expected_amount=Decimal("1"))
    assert result.status == "amount_mismatch"


@pytest.mark.asyncio
async def test_successful_fulfillment_delivers() -> None:
    result = await fulfill(
        provider=MockDigitalGoodsProvider(),
        external_product_id="mock-apple-us",
        amount=Decimal("25"),
        idempotency_key="fulfill-order-1",
    )
    assert result.state == OrderState.DELIVERED
    assert result.purchase is not None
    assert result.purchase.delivery_secret == "MOCK-CODE-NOT-REDEEMABLE"


@pytest.mark.asyncio
async def test_provider_timeout_never_blindly_retries_purchase() -> None:
    result = await fulfill(
        provider=TimeoutProvider(),
        external_product_id="mock-apple-us",
        amount=Decimal("25"),
        idempotency_key="fulfill-order-timeout",
    )
    assert result.state == OrderState.RECONCILIATION_REQUIRED
    assert result.reason == "provider_outcome_unknown"
