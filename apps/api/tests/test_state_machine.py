import pytest

from app.models import OrderState
from app.orders.state_machine import InvalidOrderTransition, assert_transition


def test_happy_path_transitions_are_allowed() -> None:
    path = [
        OrderState.CREATED,
        OrderState.PREFLIGHT_OK,
        OrderState.PAYMENT_PENDING,
        OrderState.PAID,
        OrderState.FULFILLMENT_PENDING,
        OrderState.PROCESSING,
        OrderState.DELIVERED,
    ]
    for current, target in zip(path, path[1:]):
        assert_transition(current, target)


def test_cannot_mark_payment_pending_order_delivered() -> None:
    with pytest.raises(InvalidOrderTransition):
        assert_transition(OrderState.PAYMENT_PENDING, OrderState.DELIVERED)


def test_delivered_is_terminal() -> None:
    with pytest.raises(InvalidOrderTransition):
        assert_transition(OrderState.DELIVERED, OrderState.REFUND_PENDING)


def test_unknown_provider_outcome_can_enter_reconciliation() -> None:
    assert_transition(OrderState.PROCESSING, OrderState.RECONCILIATION_REQUIRED)
