from fastapi import FastAPI

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
    # DB/Redis/provider dependency checks will be added as each dependency lands.
    return {"status": "ready"}
