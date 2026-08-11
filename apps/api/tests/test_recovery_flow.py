from decimal import Decimal

import pytest

from app.fulfillment.service import reconcile
from app.models import OrderState
from app.payments.mock import MockPaymentProvider
from app.providers.base import ProviderPurchase
from app.providers.mock import MockDigitalGoodsProvider
from app.refunds.service import recover_payment
from app.worker.fulfillment import FulfillmentJob, execute_fulfillment_job, should_refund


class FinalFailureProvider(MockDigitalGoodsProvider):
    async def purchase(self, external_product_id, amount, *, idempotency_key):
        return ProviderPurchase("provider-tx-failed", "rejected")

    async def get_order_status(self, provider_transaction_id):
        return ProviderPurchase(provider_transaction_id, "rejected")


class PendingProvider(MockDigitalGoodsProvider):
    async def get_order_status(self, provider_transaction_id):
        return ProviderPurchase(provider_transaction_id, "pending")


@pytest.mark.asyncio
async def test_worker_idempotency_key_is_stable_across_retries() -> None:
    first = FulfillmentJob("order-42", "mock-apple-us", Decimal("25"), attempt=1)
    retry = FulfillmentJob("order-42", "mock-apple-us", Decimal("25"), attempt=7)
    assert first.idempotency_key == retry.idempotency_key == "fulfill:order-42"


@pytest.mark.asyncio
async def test_final_provider_failure_routes_to_refund() -> None:
    decision = await execute_fulfillment_job(
        provider=FinalFailureProvider(),
        job=FulfillmentJob("order-failed", "mock-apple-us", Decimal("25")),
    )
    assert decision.state == OrderState.FULFILLMENT_FAILED
    assert should_refund(decision)


@pytest.mark.asyncio
async def test_pending_reconciliation_does_not_refund_or_repurchase() -> None:
    decision = await reconcile(
        provider=PendingProvider(), provider_transaction_id="provider-tx-pending"
    )
    assert decision.state == OrderState.RECONCILIATION_REQUIRED
    assert not should_refund(decision)


@pytest.mark.asyncio
async def test_refund_is_idempotent_for_same_order() -> None:
    payment = MockPaymentProvider()
    intent = await payment.create_payment(
        order_id="order-7", amount=Decimal("2675000"), idempotency_key="pay:order-7"
    )
    first = await recover_payment(
        payment_provider=payment,
        payment_reference=intent.reference,
        amount=Decimal("2675000"),
        order_id="order-7",
    )
    second = await recover_payment(
        payment_provider=payment,
        payment_reference=intent.reference,
        amount=Decimal("2675000"),
        order_id="order-7",
    )
    assert first.reference == second.reference
    assert first.status == second.status == "refunded"
