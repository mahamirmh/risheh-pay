from decimal import Decimal

from .base import Availability, ProviderProduct, ProviderPurchase


class MockDigitalGoodsProvider:
    """Development provider. Never returns real digital goods."""

    async def list_products(self) -> list[ProviderProduct]:
        return [
            ProviderProduct(
                external_id="mock-apple-us",
                brand="Apple",
                name="Apple Gift Card US",
                country_code="US",
                currency="USD",
            )
        ]

    async def check_availability(self, external_product_id: str, amount: Decimal) -> Availability:
        if external_product_id != "mock-apple-us":
            return Availability(False, "unknown_product")
        return Availability(amount in {Decimal("10"), Decimal("25"), Decimal("50")})

    async def quote_cost(self, external_product_id: str, amount: Decimal) -> Decimal:
        availability = await self.check_availability(external_product_id, amount)
        if not availability.available:
            raise ValueError("Product or denomination unavailable")
        return amount

    async def purchase(
        self,
        external_product_id: str,
        amount: Decimal,
        *,
        idempotency_key: str,
    ) -> ProviderPurchase:
        availability = await self.check_availability(external_product_id, amount)
        if not availability.available:
            return ProviderPurchase("mock-rejected", "rejected")
        return ProviderPurchase(
            provider_transaction_id=f"mock-{idempotency_key}",
            status="delivered",
            delivery_secret="MOCK-CODE-NOT-REDEEMABLE",
        )

    async def get_order_status(self, provider_transaction_id: str) -> ProviderPurchase:
        return ProviderPurchase(
            provider_transaction_id=provider_transaction_id,
            status="delivered",
            delivery_secret="MOCK-CODE-NOT-REDEEMABLE",
        )
