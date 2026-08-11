from dataclasses import dataclass
from decimal import Decimal

from app.payments.base import PaymentProvider


@dataclass(frozen=True, slots=True)
class RefundResult:
    reference: str
    amount: Decimal
    status: str


async def recover_payment(
    *,
    payment_provider: PaymentProvider,
    payment_reference: str,
    amount: Decimal,
    order_id: str,
) -> RefundResult:
    reference = await payment_provider.refund(
        reference=payment_reference,
        amount=amount,
        idempotency_key=f"refund:{order_id}",
    )
    return RefundResult(reference=reference, amount=amount, status="refunded")
