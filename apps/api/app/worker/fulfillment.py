from dataclasses import dataclass
from decimal import Decimal

from app.fulfillment.service import FulfillmentDecision, fulfill, reconcile
from app.models import OrderState
from app.providers.base import DigitalGoodsProvider


@dataclass(frozen=True, slots=True)
class FulfillmentJob:
    order_id: str
    external_product_id: str
    denomination: Decimal
    attempt: int = 1

    @property
    def idempotency_key(self) -> str:
        # Stable for the logical order purchase; do not generate a new key on worker retry.
        return f"fulfill:{self.order_id}"


async def execute_fulfillment_job(
    *, provider: DigitalGoodsProvider, job: FulfillmentJob
) -> FulfillmentDecision:
    return await fulfill(
        provider=provider,
        external_product_id=job.external_product_id,
        amount=job.denomination,
        idempotency_key=job.idempotency_key,
    )


async def execute_reconciliation_job(
    *, provider: DigitalGoodsProvider, provider_transaction_id: str
) -> FulfillmentDecision:
    return await reconcile(provider=provider, provider_transaction_id=provider_transaction_id)


def should_refund(decision: FulfillmentDecision) -> bool:
    return decision.state == OrderState.FULFILLMENT_FAILED
