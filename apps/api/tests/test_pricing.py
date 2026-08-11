from decimal import Decimal

import pytest

from app.pricing.service import calculate_price


def test_price_includes_cost_buffers_and_margin() -> None:
    price = calculate_price(
        provider_cost=Decimal("25"),
        fx_rate=Decimal("100000"),
        payment_fee_rate=Decimal("0.01"),
        risk_buffer_rate=Decimal("0.01"),
        margin_rate=Decimal("0.05"),
    )
    assert price.base_rial == Decimal("2500000")
    assert price.final_amount == Decimal("2675000")


def test_negative_margin_is_rejected() -> None:
    with pytest.raises(ValueError):
        calculate_price(
            provider_cost=Decimal("25"),
            fx_rate=Decimal("100000"),
            margin_rate=Decimal("-0.01"),
        )
