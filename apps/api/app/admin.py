"""Operator/admin endpoints.

Gated by `require_admin` (see app/security/admin.py). Covers the slice of
the PRD's Admin scope needed to actually operate the MVP day-to-day:
inspecting orders, reading the audit trail, and enabling/disabling catalog
variants. Full per-operator accounts + granular roles are future work
(tracked as the "Identity & access" domain in docs/ARCHITECTURE.md); this
gives the operator scope real access control today instead of none.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import AuditLog, Order, ProductVariant
from app.security.admin import require_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/orders")
async def list_orders(limit: int = 50, db: AsyncSession = Depends(get_db)) -> list[dict]:
    limit = max(1, min(limit, 200))
    rows = (
        await db.execute(select(Order).order_by(Order.created_at.desc()).limit(limit))
    ).scalars().all()
    return [
        {
            "id": str(order.id),
            "state": order.state.value,
            "correlation_id": order.correlation_id,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
        }
        for order in rows
    ]


@router.get("/audit-log")
async def list_audit_log(limit: int = 100, db: AsyncSession = Depends(get_db)) -> list[dict]:
    limit = max(1, min(limit, 500))
    rows = (
        await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
    ).scalars().all()
    return [
        {
            "id": str(entry.id),
            "correlation_id": entry.correlation_id,
            "actor": entry.actor,
            "event": entry.event,
            "payload": entry.payload,
            "created_at": entry.created_at,
        }
        for entry in rows
    ]


@router.post("/variants/{variant_id}/enable")
async def enable_variant(variant_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    return await _set_variant_enabled(db, variant_id, True)


@router.post("/variants/{variant_id}/disable")
async def disable_variant(variant_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    return await _set_variant_enabled(db, variant_id, False)


async def _set_variant_enabled(db: AsyncSession, variant_id: uuid.UUID, enabled: bool) -> dict:
    variant = await db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    variant.enabled = enabled
    db.add(
        AuditLog(
            correlation_id=f"admin-{variant.id}",
            actor="admin",
            event="variant_enabled" if enabled else "variant_disabled",
            payload={"variant_id": str(variant.id)},
        )
    )
    await db.commit()
    return {"id": str(variant.id), "enabled": variant.enabled}
