from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.schemas import VideoRecordDTO
from app.services.platforms.base import BasePlatformAdapter
from app.utils.rate_limit import retry_async


def _parse_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class YouTubeAdapter(BasePlatformAdapter):
    platform = "youtube"

    async def search_videos(
        self,
        keyword: str,
        max_results: int,
        date_start: str | None,
        date_end: str | None,
    ) -> list[VideoRecordDTO]:
        settings = get_settings()
        if not settings.youtube_api_key:
            return [
                VideoRecordDTO(
                    platform=self.platform,
                    keyword=keyword,
                    platform_video_id=f"status:{self.platform}:{keyword}",
                    title="YouTube API key is not configured",
                    raw_json={"required_env": "YOUTUBE_API_KEY"},
                    source_status="youtube_api_key_missing",
                )
            ]

        timeout = httpx.Timeout(settings.request_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            search_params: dict[str, Any] = {
                "part": "snippet",
                "type": "video",
                "q": keyword,
                "maxResults": max(1, min(max_results, 50)),
                "key": settings.youtube_api_key,
            }
            if date_start:
                search_params["publishedAfter"] = f"{date_start}T00:00:00Z"
            if date_end:
                search_params["publishedBefore"] = f"{date_end}T23:59:59Z"

            search_response = await retry_async(
                lambda: client.get("https://www.googleapis.com/youtube/v3/search", params=search_params),
            )
            search_response.raise_for_status()
            search_payload = search_response.json()
            search_items = search_payload.get("items", [])
            video_ids = [
                item.get("id", {}).get("videoId")
                for item in search_items
                if item.get("id", {}).get("videoId")
            ]
            if not video_ids:
                return []

            video_response = await retry_async(
                lambda: client.get(
                    "https://www.googleapis.com/youtube/v3/videos",
                    params={
                        "part": "snippet,statistics,contentDetails",
                        "id": ",".join(video_ids),
                        "key": settings.youtube_api_key,
                    },
                ),
            )
            video_response.raise_for_status()
            video_payload = video_response.json()
            by_id = {item.get("id"): item for item in video_payload.get("items", [])}

        records: list[VideoRecordDTO] = []
        for search_item in search_items:
            video_id = search_item.get("id", {}).get("videoId")
            if not video_id:
                continue
            video_item = by_id.get(video_id, {})
            snippet = video_item.get("snippet") or search_item.get("snippet", {})
            stats = video_item.get("statistics", {})
            thumbnails = snippet.get("thumbnails", {})
            thumbnail = (
                thumbnails.get("maxres")
                or thumbnails.get("high")
                or thumbnails.get("medium")
                or thumbnails.get("default")
                or {}
            )

            records.append(
                VideoRecordDTO(
                    platform=self.platform,
                    keyword=keyword,
                    platform_video_id=video_id,
                    title=snippet.get("title"),
                    author_name=snippet.get("channelTitle"),
                    author_url=f"https://www.youtube.com/channel/{snippet.get('channelId')}"
                    if snippet.get("channelId")
                    else None,
                    video_url=f"https://www.youtube.com/watch?v={video_id}",
                    thumbnail_url=thumbnail.get("url"),
                    published_at=snippet.get("publishedAt"),
                    duration=video_item.get("contentDetails", {}).get("duration"),
                    view_count=_parse_int(stats.get("viewCount")),
                    like_count=_parse_int(stats.get("likeCount")),
                    favorite_count=None,
                    comment_count=_parse_int(stats.get("commentCount")),
                    share_count=None,
                    raw_json={"search_item": search_item, "video_item": video_item},
                    source_status="ok",
                )
            )
        return records
