from __future__ import annotations

from datetime import datetime, timezone
import re

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import VideoRecord, XUsageLedger
from app.utils.csv_export import videos_to_csv

router = APIRouter(prefix="/api/export", tags=["export"])


def _filename(platform: str | None, keyword: str | None) -> str:
    date = datetime.now(timezone.utc).date().isoformat()
    keyword_part = re.sub(r"[^a-zA-Z0-9]+", "-", keyword or "").strip("-")
    if not keyword_part:
        keyword_part = "multi_keywords"
    return f"social_video_tracker_{keyword_part}_{date}.csv"


@router.get("/csv")
def export_csv(
    platform: str | None = None,
    keyword: str | None = None,
    title: str | None = None,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    stmt = select(VideoRecord)
    if platform:
        stmt = stmt.where(VideoRecord.platform == platform)
    if keyword:
        stmt = stmt.where(VideoRecord.keyword.ilike(f"%{keyword}%"))
    if title:
        stmt = stmt.where(VideoRecord.title.ilike(f"%{title}%"))

    rows = list(db.execute(stmt.order_by(VideoRecord.keyword.asc(), VideoRecord.view_count.desc())).scalars())
    x_costs: dict[tuple[str | None, str], float] = {}
    if any(row.platform == "x" for row in rows):
        ledgers = list(db.execute(select(XUsageLedger)).scalars())
        for ledger in ledgers:
            if ledger.keyword:
                x_costs[(ledger.job_id, ledger.keyword)] = ledger.estimated_total_cost
    csv_text = videos_to_csv(rows, x_costs)
    return StreamingResponse(
        iter([csv_text]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{_filename(platform, keyword)}"'},
    )
