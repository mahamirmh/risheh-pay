from app.models import OrderState


class InvalidOrderTransition(ValueError):
    pass


ALLOWED_TRANSITIONS: dict[OrderState, frozenset[OrderState]] = {
    OrderState.CREATED: frozenset({OrderState.PREFLIGHT_OK, OrderState.CANCELLED}),
    OrderState.PREFLIGHT_OK: frozenset({OrderState.PAYMENT_PENDING, OrderState.CANCELLED}),
    OrderState.PAYMENT_PENDING: frozenset({OrderState.PAID, OrderState.CANCELLED}),
    OrderState.PAID: frozenset({OrderState.FULFILLMENT_PENDING}),
    OrderState.FULFILLMENT_PENDING: frozenset({OrderState.PROCESSING}),
    OrderState.PROCESSING: frozenset(
        {
            OrderState.DELIVERED,
            OrderState.RETRYING,
            OrderState.RECONCILIATION_REQUIRED,
            OrderState.FULFILLMENT_FAILED,
        }
    ),
    OrderState.RETRYING: frozenset({OrderState.PROCESSING, OrderState.FULFILLMENT_FAILED}),
    OrderState.RECONCILIATION_REQUIRED: frozenset(
        {OrderState.DELIVERED, OrderState.RETRYING, OrderState.FULFILLMENT_FAILED}
    ),
    OrderState.FULFILLMENT_FAILED: frozenset({OrderState.REFUND_PENDING}),
    OrderState.REFUND_PENDING: frozenset({OrderState.REFUNDED}),
    OrderState.DELIVERED: frozenset(),
    OrderState.REFUNDED: frozenset(),
    OrderState.CANCELLED: frozenset(),
}


def assert_transition(current: OrderState, target: OrderState) -> None:
    if target not in ALLOWED_TRANSITIONS[current]:
        raise InvalidOrderTransition(f"Invalid order transition: {current.value} -> {target.value}")
