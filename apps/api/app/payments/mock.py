from decimal import Decimal

from .base import PaymentIntent, PaymentVerification


class MockPaymentProvider:
    def __init__(self) -> None:
        self._intents: dict[str, PaymentIntent] = {}
        self._amounts: dict[str, Decimal] = {}
        self._refunds: dict[str, str] = {}

    async def create_payment(
        self, *, order_id: str, amount: Decimal, idempotency_key: str
    ) -> PaymentIntent:
        if idempotency_key in self._intents:
            return self._intents[idempotency_key]
        reference = f"mock-pay-{order_id}"
        intent = PaymentIntent(reference, f"https://mock.invalid/pay/{reference}", "pending")
        self._intents[idempotency_key] = intent
        self._amounts[reference] = amount
        return intent

    async def verify(self, *, reference: str, expected_amount: Decimal) -> PaymentVerification:
        actual = self._amounts.get(reference)
        if actual is None:
            return PaymentVerification(reference, "not_found", Decimal("0"))
        if actual != expected_amount:
            return PaymentVerification(reference, "amount_mismatch", actual)
        return PaymentVerification(reference, "paid", actual)

    async def refund(
        self, *, reference: str, amount: Decimal, idempotency_key: str
    ) -> str:
        if idempotency_key in self._refunds:
            return self._refunds[idempotency_key]
        if self._amounts.get(reference) != amount:
            raise ValueError("refund amount mismatch")
        refund_reference = f"mock-refund-{reference}"
        self._refunds[idempotency_key] = refund_reference
        return refund_reference
