"""Minimal RBAC gate for operator/admin endpoints.

The PRD defines an Admin scope (catalog enable/disable, orders, audit log)
and SECURITY.md requires RBAC on admin functions, but no identity/access
domain exists yet in this MVP. Until real accounts + roles ship, admin
endpoints are gated behind a single server-held API key supplied via the
`X-Admin-Api-Key` header. This is intentionally simple and easy to replace
with per-operator accounts later without changing calling conventions.
"""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException

from app.db import settings


async def require_admin(x_admin_api_key: str | None = Header(default=None)) -> None:
    configured = settings.admin_api_key
    if not configured:
        raise HTTPException(
            status_code=503,
            detail="Admin access is not configured on this deployment.",
        )
    if not x_admin_api_key or not hmac.compare_digest(x_admin_api_key, configured):
        raise HTTPException(status_code=401, detail="Invalid or missing admin credentials")
