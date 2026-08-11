import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, Order, OrderState
from app.orders.state_machine import assert_transition


class OrderNotFound(LookupError):
    pass


async def get_order_for_update(session: AsyncSession, order_id: uuid.UUID) -> Order:
    result = await session.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise OrderNotFound(str(order_id))
    return order


async def transition_order(
    session: AsyncSession,
    *,
    order_id: uuid.UUID,
    target: OrderState,
    actor: str,
    event: str,
) -> Order:
    order = await get_order_for_update(session, order_id)
    previous = order.state
    assert_transition(previous, target)
    order.state = target
    session.add(
        AuditLog(
            correlation_id=order.correlation_id,
            actor=actor,
            event=event,
            payload={"from": previous.value, "to": target.value, "order_id": str(order.id)},
        )
    )
    await session.flush()
    return order
