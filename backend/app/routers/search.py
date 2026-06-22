from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.services.collector import ADAPTERS
from app.schemas import KeywordSearchItem, KeywordSearchRequest, KeywordSearchResponse

router = APIRouter(prefix="/api/search", tags=["search"])


def _date_start(date_range: str | None) -> str | None:
    if not date_range or not date_range.endswith("d"):
        return None
    try:
        days = int(date_range[:-1])
    except ValueError:
        return None
    return (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()


@router.post("/keywords", response_model=KeywordSearchResponse)
async def search_keywords(payload: KeywordSearchRequest) -> KeywordSearchResponse:
    warnings: list[str] = []
    items: list[KeywordSearchItem] = []
    platforms = [platform.lower().strip() for platform in payload.platforms]

    for platform in platforms:
        adapter = ADAPTERS.get(platform)
        if not adapter:
            warnings.append(f"{platform}: unsupported platform.")
            continue

        records = await adapter.search_videos(
            keyword=payload.keyword,
            max_results=min(payload.limit, 50),
            date_start=_date_start(payload.date_range),
            date_end=None,
        )
        for record in records:
            collected_at = datetime.now(timezone.utc).isoformat()
            if record.source_status != "ok":
                warnings.append(f"{platform}: {record.title or record.source_status}")
                continue
            if payload.min_views is not None and (record.view_count or 0) < payload.min_views:
                continue
            if payload.min_likes is not None and (record.like_count or 0) < payload.min_likes:
                continue
            items.append(
                KeywordSearchItem(
                    platform=record.platform,
                    keyword=record.keyword,
                    video_url=record.video_url,
                    title=record.title,
                    author=record.author_name,
                    published_at=record.published_at,
                    likes=record.like_count,
                    comments=record.comment_count,
                    favorites=record.favorite_count,
                    shares=record.share_count,
                    collected_at=collected_at,
                )
            )

    return KeywordSearchResponse(items=items, warnings=warnings)
