from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import XUsageLedger
from app.services.x_billing import billing_summary, update_balance

router = APIRouter(prefix="/api/x", tags=["x-billing"])


class BalanceUpdate(BaseModel):
    balance_usd: float = Field(ge=0)


def _x_error(status_code: int, payload: Any) -> tuple[str, str]:
    raw = str(payload).lower()
    if status_code in {402, 403} and any(term in raw for term in ["credit", "usage", "cap", "payment"]):
        return "credits_insufficient", "X API credits are insufficient."
    if status_code in {401, 403}:
        return "permission_denied", "X API permission is insufficient."
    if status_code == 429:
        return "rate_limited", "X API rate limit reached."
    return "request_failed", "X API request failed."


@router.get("/billing/status")
def billing_status(db: Session = Depends(get_db)) -> dict[str, Any]:
    settings = get_settings()
    summary = billing_summary(db)
    configured = bool(settings.x_bearer_token)
    remaining = summary["estimated_remaining_balance"]
    if not configured:
        message = "X_BEARER_TOKEN is not configured."
    elif remaining <= 0:
        message = "Estimated X balance is insufficient. Please update balance or purchase credits."
    elif remaining < 1:
        message = "X API estimated balance is low."
    else:
        message = "X billing estimate is available."
    return {
        "configured": configured,
        **summary,
        "message": message,
    }


@router.get("/billing/usage")
def billing_usage(limit: int = 50, db: Session = Depends(get_db)) -> dict[str, Any]:
    safe_limit = max(1, min(limit, 200))
    rows = list(db.execute(select(XUsageLedger).order_by(XUsageLedger.created_at.desc()).limit(safe_limit)).scalars())
    return {
        "items": [
            {
                "id": row.id,
                "created_at": row.created_at,
                "job_id": row.job_id,
                "keyword": row.keyword,
                "endpoint": row.endpoint,
                "posts_returned": row.posts_returned,
                "users_returned": row.users_returned,
                "estimated_post_cost": row.estimated_post_cost,
                "estimated_user_cost": row.estimated_user_cost,
                "estimated_total_cost": row.estimated_total_cost,
                "balance_before": row.balance_before,
                "balance_after": row.balance_after,
                "status": row.status,
                "error_message": row.error_message,
            }
            for row in rows
        ]
    }


@router.post("/billing/balance")
def billing_balance(payload: BalanceUpdate, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = update_balance(db, payload.balance_usd)
    db.commit()
    db.refresh(row)
    return {"status": "ok", "balance_usd": row.balance_usd, "created_at": row.created_at}


@router.get("/usage/official")
async def official_usage() -> dict[str, Any]:
    settings = get_settings()
    if not settings.x_bearer_token:
        raise HTTPException(status_code=400, detail="X_BEARER_TOKEN is not configured.")
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(
                "https://api.x.com/2/usage/tweets",
                headers={"Authorization": f"Bearer {settings.x_bearer_token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="X API usage request failed.") from exc
    if response.status_code >= 400:
        try:
            payload: Any = response.json()
        except ValueError:
            payload = {"message": response.text}
        status, message = _x_error(response.status_code, payload)
        raise HTTPException(status_code=response.status_code, detail={"status": status, "message": message})
    return response.json()
