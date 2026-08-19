"""Redis-backed fixed-window rate limiting.

SECURITY.md requires rate limiting on auth, checkout, payment and reveal
endpoints; none existed. This is a small, dependency-injectable limiter
keyed by client IP + route, using a single INCR/EXPIRE round trip per
request so it stays cheap on the hot checkout path.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from redis.asyncio import Redis

from app.db import settings

_redis: Redis | None = None


def _client() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def rate_limit(key_prefix: str, *, limit: int, window_seconds: int):
    """Return a FastAPI dependency enforcing `limit` requests per
    `window_seconds` per client IP for the given logical route."""

    async def _dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{key_prefix}:{client_ip}"
        redis = _client()
        try:
            current = await redis.incr(key)
            if current == 1:
                await redis.expire(key, window_seconds)
        except Exception:
            # Fail open: Redis being unavailable must not take down checkout.
            # Availability of the purchase flow matters more than the limiter
            # itself, and the state machine + idempotency keys already bound
            # the damage a burst of requests can do.
            return
        if current > limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait a moment and try again.",
            )

    return Depends(_dependency)
