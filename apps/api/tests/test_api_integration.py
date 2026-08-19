"""HTTP-level integration tests against a real (test) database.

The service-layer unit tests elsewhere in this suite exercise
`app/fulfillment/service.py`, `app/orders/state_machine.py`, etc. directly,
but nothing previously called the actual HTTP endpoints in `app/api.py` -
which is how a real attribute-name bug (`payment.checkout_url` instead of
`payment.payment_url`) shipped: every single `/orders` call crashed with an
AttributeError, and no test caught it. These tests drive the endpoints
end-to-end instead.
"""

from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import SessionLocal, engine, settings
from app.main import app
from app.models import Base, Product, ProductVariant


@pytest.fixture(autouse=True)
async def _schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # `engine` is a module-level singleton (app/db.py) reused across every
    # test, but pytest-asyncio gives each test function its own event loop
    # by default. Pooled connections opened under one test's loop are
    # unusable (and error noisily on teardown) once that loop closes, so
    # dispose the pool after each test and let the next test open fresh
    # connections under its own loop.
    await engine.dispose()


@pytest.fixture(autouse=True)
def _configure_secrets(monkeypatch):
    """Encryption and admin-auth are refused (not silently insecure) unless
    configured; give the test suite deterministic values regardless of the
    environment it runs in."""
    monkeypatch.setattr(settings, "delivery_encryption_key", "test-only-key-do-not-use-in-prod")
    monkeypatch.setattr(settings, "admin_api_key", "test-admin-key")


async def _seed_variant() -> str:
    async with SessionLocal() as session:
        product = Product(brand="TestBrand", name="Test Gift Card", category="gift_card")
        session.add(product)
        await session.flush()
        variant = ProductVariant(
            product_id=product.id,
            country_code="US",
            currency="USD",
            denomination=Decimal("25"),
            enabled=True,
        )
        session.add(variant)
        await session.commit()
        await session.refresh(variant)
        return str(variant.id)


@pytest.mark.asyncio
async def test_full_checkout_flow_is_idempotent_and_returns_payment_url() -> None:
    variant_id = await _seed_variant()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        quote_resp = await client.post("/api/v1/quotes", json={"variant_id": variant_id})
        assert quote_resp.status_code == 200
        quote = quote_resp.json()

        order_resp = await client.post("/api/v1/orders", json={"quote_id": quote["id"]})
        assert order_resp.status_code == 200
        order = order_resp.json()
        # Regression test for the payment_url/checkout_url attribute-name
        # bug: this response field must be present and populated.
        assert order["payment_url"].startswith("https://mock.invalid/pay/")

        pay_resp = await client.post(f"/api/v1/orders/{order['id']}/pay")
        assert pay_resp.status_code == 200
        paid = pay_resp.json()
        assert paid["state"] == "DELIVERED"
        assert paid["delivery"] == "MOCK-CODE-NOT-REDEEMABLE"

        # Idempotency: a duplicated /pay call (retry, double tap) must not
        # re-verify payment or re-purchase from the provider - it just
        # reports the order's current state.
        pay_again = await client.post(f"/api/v1/orders/{order['id']}/pay")
        assert pay_again.status_code == 200
        assert pay_again.json()["state"] == "DELIVERED"

        order_after = await client.get(f"/api/v1/orders/{order['id']}")
        assert order_after.json()["state"] == "DELIVERED"


@pytest.mark.asyncio
async def test_delivery_secret_is_encrypted_at_rest() -> None:
    variant_id = await _seed_variant()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        quote = (await client.post("/api/v1/quotes", json={"variant_id": variant_id})).json()
        order = (await client.post("/api/v1/orders", json={"quote_id": quote["id"]})).json()
        await client.post(f"/api/v1/orders/{order['id']}/pay")

    from sqlalchemy import select

    from app.models import DigitalDelivery

    async with SessionLocal() as session:
        delivery = (
            await session.execute(
                select(DigitalDelivery).where(DigitalDelivery.order_id == order["id"])
            )
        ).scalar_one()
        assert delivery.encrypted_payload != "MOCK-CODE-NOT-REDEEMABLE"
        assert "MOCK-CODE-NOT-REDEEMABLE" not in delivery.encrypted_payload


@pytest.mark.asyncio
async def test_admin_endpoints_require_the_configured_api_key() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unauthenticated = await client.get("/api/v1/admin/orders")
        assert unauthenticated.status_code == 401

        wrong_key = await client.get(
            "/api/v1/admin/orders", headers={"X-Admin-Api-Key": "not-the-right-key"}
        )
        assert wrong_key.status_code == 401

        authorized = await client.get(
            "/api/v1/admin/orders", headers={"X-Admin-Api-Key": "test-admin-key"}
        )
        assert authorized.status_code == 200


@pytest.mark.asyncio
async def test_admin_endpoints_are_disabled_when_no_key_is_configured(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_api_key", None)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/admin/orders", headers={"X-Admin-Api-Key": "anything"}
        )
        assert response.status_code == 503


@pytest.mark.asyncio
async def test_products_can_be_filtered_by_category() -> None:
    variant_id = await _seed_variant()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        gift_cards = await client.get("/api/v1/products", params={"category": "gift_card"})
        assert gift_cards.status_code == 200
        assert any(p["id"] == variant_id for p in gift_cards.json())

        other = await client.get("/api/v1/products", params={"category": "subscription"})
        assert other.json() == []

        categories = await client.get("/api/v1/categories")
        assert {"category": "gift_card", "product_count": 1} in categories.json()
