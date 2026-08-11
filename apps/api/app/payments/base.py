from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True, slots=True)
class PaymentIntent:
    reference: str
    payment_url: str
    status: str


@dataclass(frozen=True, slots=True)
class PaymentVerification:
    reference: str
    status: str
    amount: Decimal


class PaymentProvider(Protocol):
    async def create_payment(
        self, *, order_id: str, amount: Decimal, idempotency_key: str
    ) -> PaymentIntent: ...

    async def verify(self, *, reference: str, expected_amount: Decimal) -> PaymentVerification: ...

    async def refund(
        self, *, reference: str, amount: Decimal, idempotency_key: str
    ) -> str: ...
