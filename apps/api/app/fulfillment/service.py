from dataclasses import dataclass
from decimal import Decimal

from app.models import OrderState
from app.providers.base import DigitalGoodsProvider, ProviderPurchase


@dataclass(frozen=True, slots=True)
class FulfillmentDecision:
    state: OrderState
    purchase: ProviderPurchase | None = None
    reason: str | None = None


async def fulfill(
    *,
    provider: DigitalGoodsProvider,
    external_product_id: str,
    amount: Decimal,
    idempotency_key: str,
) -> FulfillmentDecision:
    try:
        purchase = await provider.purchase(
            external_product_id,
            amount,
            idempotency_key=idempotency_key,
        )
    except TimeoutError:
        # Critical: timeout does not mean purchase failed. A retry could buy twice.
        return FulfillmentDecision(
            OrderState.RECONCILIATION_REQUIRED,
            reason="provider_outcome_unknown",
        )

    if purchase.status == "delivered" and purchase.delivery_secret:
        return FulfillmentDecision(OrderState.DELIVERED, purchase=purchase)
    if purchase.status in {"pending", "processing", "unknown"}:
        return FulfillmentDecision(
            OrderState.RECONCILIATION_REQUIRED,
            purchase=purchase,
            reason="provider_outcome_not_final",
        )
    return FulfillmentDecision(
        OrderState.FULFILLMENT_FAILED,
        purchase=purchase,
        reason="provider_rejected",
    )


async def reconcile(
    *, provider: DigitalGoodsProvider, provider_transaction_id: str
) -> FulfillmentDecision:
    purchase = await provider.get_order_status(provider_transaction_id)
    if purchase.status == "delivered" and purchase.delivery_secret:
        return FulfillmentDecision(OrderState.DELIVERED, purchase=purchase)
    if purchase.status in {"pending", "processing", "unknown"}:
        return FulfillmentDecision(
            OrderState.RECONCILIATION_REQUIRED,
            purchase=purchase,
            reason="provider_still_pending",
        )
    return FulfillmentDecision(
        OrderState.FULFILLMENT_FAILED,
        purchase=purchase,
        reason="provider_final_failure",
    )
