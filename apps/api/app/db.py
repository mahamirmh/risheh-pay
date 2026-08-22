from collections.abc import AsyncIterator

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/risheh_digital_goods"
    redis_url: str = "redis://redis:6379/0"
    # Explicit allow-list. "*" must never be combined with allow_credentials=True
    # (browsers reject the combination outright, and it is unsafe besides) -
    # see app/main.py.
    cors_origins: list[str] = ["http://localhost:3000"]
    # Demo catalog creation is opt-in. It MUST remain false in production.
    seed_demo_catalog: bool = False
    # Server-held key gating the admin router (app/admin.py). Unset by default
    # so admin endpoints are refused (503) rather than silently open.
    admin_api_key: str | None = None
    # Key material for encrypting digital delivery secrets at rest (see
    # app/security/crypto.py). Must be set outside source control in any
    # environment that performs real fulfillment.
    delivery_encryption_key: str | None = None
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
