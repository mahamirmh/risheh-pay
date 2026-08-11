from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True, slots=True)
class ProviderProduct:
    external_id: str
    brand: str
    name: str
    country_code: str
    currency: str


@dataclass(frozen=True, slots=True)
class Availability:
    available: bool
    reason: str | None = None


@dataclass(frozen=True, slots=True)
class ProviderPurchase:
    provider_transaction_id: str
    status: str
    delivery_secret: str | None = None


class DigitalGoodsProvider(Protocol):
    async def list_products(self) -> list[ProviderProduct]: ...

    async def check_availability(self, external_product_id: str, amount: Decimal) -> Availability: ...

    async def quote_cost(self, external_product_id: str, amount: Decimal) -> Decimal: ...

    async def purchase(
        self,
        external_product_id: str,
        amount: Decimal,
        *,
        idempotency_key: str,
    ) -> ProviderPurchase: ...

    async def get_order_status(self, provider_transaction_id: str) -> ProviderPurchase: ...
