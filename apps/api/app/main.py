from fastapi import FastAPI, HTTPException
from redis.asyncio import Redis
from sqlalchemy import text

from app.db import engine, settings

app = FastAPI(
    title="Risheh Digital Goods API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)


@app.get("/health", tags=["operations"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["operations"])
async def readiness() -> dict[str, str]:
    checks: dict[str, str] = {}

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = "error"
        raise HTTPException(status_code=503, detail={"status": "not_ready", "checks": checks}) from exc

    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = "error"
        raise HTTPException(status_code=503, detail={"status": "not_ready", "checks": checks}) from exc
    finally:
        await redis.aclose()

    return {"status": "ready", **checks}
