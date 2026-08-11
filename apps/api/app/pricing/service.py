from dataclasses import dataclass
from decimal import Decimal, ROUND_UP


@dataclass(frozen=True, slots=True)
class PriceBreakdown:
    provider_cost: Decimal
    fx_rate: Decimal
    base_rial: Decimal
    payment_fee: Decimal
    risk_buffer: Decimal
    margin: Decimal
    final_amount: Decimal


def calculate_price(
    *,
    provider_cost: Decimal,
    fx_rate: Decimal,
    payment_fee_rate: Decimal = Decimal("0"),
    risk_buffer_rate: Decimal = Decimal("0.01"),
    margin_rate: Decimal = Decimal("0.05"),
) -> PriceBreakdown:
    if provider_cost <= 0 or fx_rate <= 0:
        raise ValueError("provider_cost and fx_rate must be positive")
    for value in (payment_fee_rate, risk_buffer_rate, margin_rate):
        if value < 0:
            raise ValueError("rates cannot be negative")

    base = provider_cost * fx_rate
    payment_fee = base * payment_fee_rate
    risk_buffer = base * risk_buffer_rate
    margin = base * margin_rate
    final = (base + payment_fee + risk_buffer + margin).quantize(Decimal("1"), rounding=ROUND_UP)
    return PriceBreakdown(
        provider_cost=provider_cost,
        fx_rate=fx_rate,
        base_rial=base,
        payment_fee=payment_fee,
        risk_buffer=risk_buffer,
        margin=margin,
        final_amount=final,
    )
