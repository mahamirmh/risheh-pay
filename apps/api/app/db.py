from collections.abc import AsyncIterator

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/risheh_digital_goods"
    redis_url: str = "redis://redis:6379/0"
    cors_origins: list[str] = ["*"]
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
