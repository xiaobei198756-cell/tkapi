from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import XBillingBalance, XUsageLedger


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _month_start(value: datetime) -> datetime:
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _day_start(value: datetime) -> datetime:
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def get_starting_balance(db: Session) -> float:
    latest = db.execute(select(XBillingBalance).order_by(XBillingBalance.created_at.desc())).scalar_one_or_none()
    if latest:
        return float(latest.balance_usd)
    return float(get_settings().x_credit_balance_usd or 0)


def spent_since(db: Session, start: datetime) -> float:
    value = db.execute(
        select(func.coalesce(func.sum(XUsageLedger.estimated_total_cost), 0.0)).where(XUsageLedger.created_at >= start)
    ).scalar_one()
    return float(value or 0)


def latest_balance(db: Session) -> float:
    latest = db.execute(select(XUsageLedger).order_by(XUsageLedger.created_at.desc())).scalar_one_or_none()
    if latest:
        return float(latest.balance_after)
    return get_starting_balance(db)


def last_request_cost(db: Session) -> float:
    latest = db.execute(select(XUsageLedger).order_by(XUsageLedger.created_at.desc())).scalar_one_or_none()
    return float(latest.estimated_total_cost) if latest else 0.0


def billing_summary(db: Session) -> dict[str, float]:
    now = utc_now()
    return {
        "starting_balance": get_starting_balance(db),
        "estimated_spent_today": spent_since(db, _day_start(now)),
        "estimated_spent_month": spent_since(db, _month_start(now)),
        "estimated_remaining_balance": latest_balance(db),
        "last_x_request_cost": last_request_cost(db),
    }


def estimate_cost(posts_returned: int, users_returned: int) -> tuple[float, float, float]:
    settings = get_settings()
    post_cost = float(posts_returned) * float(settings.x_post_read_unit_cost)
    user_cost = float(users_returned) * float(settings.x_user_read_unit_cost)
    return post_cost, user_cost, post_cost + user_cost


def record_x_usage(
    db: Session,
    *,
    job_id: str | None,
    keyword: str | None,
    endpoint: str,
    posts_returned: int,
    users_returned: int = 0,
    status: str = "ok",
    error_message: str | None = None,
) -> XUsageLedger:
    balance_before = latest_balance(db)
    post_cost, user_cost, total_cost = estimate_cost(posts_returned, users_returned)
    ledger = XUsageLedger(
        job_id=job_id,
        keyword=keyword,
        endpoint=endpoint,
        posts_returned=posts_returned,
        users_returned=users_returned,
        estimated_post_cost=post_cost,
        estimated_user_cost=user_cost,
        estimated_total_cost=total_cost,
        balance_before=balance_before,
        balance_after=balance_before - total_cost,
        status=status,
        error_message=error_message,
    )
    db.add(ledger)
    return ledger


def update_balance(db: Session, balance_usd: float) -> XBillingBalance:
    balance = XBillingBalance(balance_usd=balance_usd)
    db.add(balance)
    return balance
