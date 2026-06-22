from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import VideoRecord
from app.schemas import VideoListResponse, VideoRead

router = APIRouter(prefix="/api/videos", tags=["videos"])

SORTABLE_FIELDS = {
    "collected_at": VideoRecord.collected_at,
    "published_at": VideoRecord.published_at,
    "view_count": VideoRecord.view_count,
    "like_count": VideoRecord.like_count,
    "likes": VideoRecord.like_count,
    "comment_count": VideoRecord.comment_count,
    "comments": VideoRecord.comment_count,
    "favorite_count": VideoRecord.favorite_count,
    "favorites": VideoRecord.favorite_count,
    "share_count": VideoRecord.share_count,
    "shares": VideoRecord.share_count,
    "platform": VideoRecord.platform,
    "keyword": VideoRecord.keyword,
}

HEAT_SCORE = (
    func.coalesce(VideoRecord.view_count, 0)
    + func.coalesce(VideoRecord.like_count, 0) * 5
    + func.coalesce(VideoRecord.comment_count, 0) * 10
    + func.coalesce(VideoRecord.share_count, 0) * 8
    + func.coalesce(VideoRecord.favorite_count, 0) * 6
)


@router.get("", response_model=VideoListResponse)
def list_videos(
    platform: str | None = None,
    keyword: str | None = None,
    title: str | None = None,
    sort_by: str = Query(default="view_count"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> VideoListResponse:
    stmt = select(VideoRecord)
    if platform:
        stmt = stmt.where(VideoRecord.platform == platform)
    if keyword:
        stmt = stmt.where(VideoRecord.keyword.ilike(f"%{keyword}%"))
    if title:
        stmt = stmt.where(VideoRecord.title.ilike(f"%{title}%"))

    total = len(list(db.execute(stmt).scalars()))
    sort_column = HEAT_SCORE if sort_by == "heat_score" else SORTABLE_FIELDS.get(sort_by, VideoRecord.view_count)
    stmt = stmt.order_by(desc(sort_column) if order == "desc" else asc(sort_column)).offset(offset).limit(limit)
    items = list(db.execute(stmt).scalars())
    return VideoListResponse(items=items, total=total)


@router.get("/{video_id}", response_model=VideoRead)
def get_video(video_id: int, db: Session = Depends(get_db)) -> VideoRecord:
    video = db.get(VideoRecord, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video record not found")
    return video


@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)) -> dict[str, str | int]:
    video = db.get(VideoRecord, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video record not found")
    db.delete(video)
    db.commit()
    return {"status": "deleted", "id": video_id}


@router.delete("")
def delete_all_videos(db: Session = Depends(get_db)) -> dict[str, int | str]:
    count = len(list(db.execute(select(VideoRecord.id)).scalars()))
    db.query(VideoRecord).delete()
    db.commit()
    return {"status": "deleted", "count": count}
