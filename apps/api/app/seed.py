from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product, ProductVariant


async def seed_demo_catalog(session: AsyncSession) -> None:
    exists = await session.scalar(select(Product.id).limit(1))
    if exists:
        return
    product = Product(brand="Apple", name="Apple Gift Card US", category="gift_card")
    session.add(product)
    await session.flush()
    for amount in (Decimal("10"), Decimal("25"), Decimal("50")):
        session.add(ProductVariant(product_id=product.id, country_code="US", currency="USD", denomination=amount, enabled=True))
    await session.commit()
