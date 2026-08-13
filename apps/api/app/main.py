from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from sqlalchemy import text

from app.api import router as api_router
from app.db import SessionLocal, engine, settings
from app.seed import seed_demo_catalog

app = FastAPI(title="Risheh Digital Goods API", version="0.2.0", docs_url="/docs", redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.on_event("startup")
async def startup() -> None:
    async with SessionLocal() as session:
        await seed_demo_catalog(session)


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
