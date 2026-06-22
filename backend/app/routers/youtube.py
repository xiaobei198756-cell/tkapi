from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.schemas import YouTubeSearchItem, YouTubeSearchResponse
from app.utils.rate_limit import retry_async

router = APIRouter(prefix="/api/youtube", tags=["youtube"])


def _parse_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _youtube_error_message(payload: dict[str, Any]) -> tuple[int, str]:
    errors = payload.get("error", {}).get("errors", [])
    reason = errors[0].get("reason") if errors else payload.get("error", {}).get("status")
    message = payload.get("error", {}).get("message") or "YouTube API request failed"
    if reason in {"quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"}:
        return 429, "YouTube API quota is insufficient or exhausted."
    return 502, message


@router.get("/search", response_model=YouTubeSearchResponse)
async def search_youtube(
    keyword: str = Query(min_length=1),
    max_results: int = Query(default=5, ge=1, le=50),
) -> YouTubeSearchResponse:
    settings = get_settings()
    if not settings.youtube_api_key:
        raise HTTPException(status_code=400, detail="API Key is not configured. Set YOUTUBE_API_KEY in .env.")

    timeout = httpx.Timeout(settings.request_timeout_seconds)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            search_response = await retry_async(
                lambda: client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={
                        "part": "snippet",
                        "type": "video",
                        "q": keyword,
                        "maxResults": max_results,
                        "key": settings.youtube_api_key,
                    },
                )
            )
            if search_response.status_code >= 400:
                status_code, message = _youtube_error_message(search_response.json())
                raise HTTPException(status_code=status_code, detail=message)

            search_payload = search_response.json()
            search_items = search_payload.get("items", [])
            video_ids = [
                item.get("id", {}).get("videoId")
                for item in search_items
                if item.get("id", {}).get("videoId")
            ]
            if not video_ids:
                return YouTubeSearchResponse(
                    keyword=keyword,
                    total=0,
                    items=[],
                    message="No videos found.",
                )

            videos_response = await retry_async(
                lambda: client.get(
                    "https://www.googleapis.com/youtube/v3/videos",
                    params={
                        "part": "snippet,statistics",
                        "id": ",".join(video_ids),
                        "key": settings.youtube_api_key,
                    },
                )
            )
            if videos_response.status_code >= 400:
                status_code, message = _youtube_error_message(videos_response.json())
                raise HTTPException(status_code=status_code, detail=message)

            videos_payload = videos_response.json()
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"YouTube API request failed: {exc}") from exc

    items: list[YouTubeSearchItem] = []
    for item in videos_payload.get("items", []):
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        video_id = item.get("id")
        if not video_id:
            continue
        items.append(
            YouTubeSearchItem(
                platform="youtube",
                keyword=keyword,
                video_url=f"https://www.youtube.com/watch?v={video_id}",
                title=snippet.get("title"),
                author=snippet.get("channelTitle"),
                published_at=snippet.get("publishedAt"),
                likes=_parse_int(stats.get("likeCount")),
                comments=_parse_int(stats.get("commentCount")),
                favorites=None,
                shares=None,
                collected_at=datetime.now(timezone.utc).isoformat(),
            )
        )

    return YouTubeSearchResponse(
        keyword=keyword,
        total=len(items),
        items=items,
        message=None if items else "No videos found.",
    )
