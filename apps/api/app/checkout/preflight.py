from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.pricing.service import PriceBreakdown, calculate_price
from app.providers.base import DigitalGoodsProvider


class PreflightRejected(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class PreflightQuote:
    external_product_id: str
    denomination: Decimal
    price: PriceBreakdown
    expires_at: datetime

    def is_expired(self, now: datetime | None = None) -> bool:
        return (now or datetime.now(UTC)) >= self.expires_at


async def create_preflight_quote(
    *,
    provider: DigitalGoodsProvider,
    external_product_id: str,
    denomination: Decimal,
    fx_rate: Decimal,
    payment_fee_rate: Decimal = Decimal("0"),
    risk_buffer_rate: Decimal = Decimal("0.01"),
    margin_rate: Decimal = Decimal("0.05"),
    ttl_seconds: int = 180,
) -> PreflightQuote:
    availability = await provider.check_availability(external_product_id, denomination)
    if not availability.available:
        raise PreflightRejected(availability.reason or "product_unavailable")

    provider_cost = await provider.quote_cost(external_product_id, denomination)
    price = calculate_price(
        provider_cost=provider_cost,
        fx_rate=fx_rate,
        payment_fee_rate=payment_fee_rate,
        risk_buffer_rate=risk_buffer_rate,
        margin_rate=margin_rate,
    )
    return PreflightQuote(
        external_product_id=external_product_id,
        denomination=denomination,
        price=price,
        expires_at=datetime.now(UTC) + timedelta(seconds=ttl_seconds),
    )
