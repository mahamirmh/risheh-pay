from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from sqlalchemy import text

from app.admin import router as admin_router
from app.api import router as api_router
from app.db import SessionLocal, engine, settings
from app.seed import seed_demo_catalog

app = FastAPI(title="Risheh Digital Goods API", version="0.2.0", docs_url="/docs", redoc_url=None)
# No cookie-based auth is used anywhere in this API (admin auth is a header
# API key, see app/security/admin.py), so credentials never need to cross
# origins. Keeping allow_credentials off lets cors_origins stay a plain
# allow-list without risking the invalid/insecure "*" + credentials
# combination that browsers refuse to honor anyway.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Admin-Api-Key"],
)
app.include_router(api_router)
app.include_router(admin_router)


@app.on_event("startup")
async def startup() -> None:
    if settings.seed_demo_catalog:
        if settings.app_env.lower() == "production":
            raise RuntimeError("SEED_DEMO_CATALOG must be false in production")
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
