from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.schemas import VideoRecordDTO
from app.services.platforms.base import BasePlatformAdapter


SEARCH_ENDPOINT = "https://api.x.com/2/tweets/search/recent"


def _status_record(keyword: str, query: str, max_results: int, source_status: str, title: str) -> list[VideoRecordDTO]:
    return [
        VideoRecordDTO(
            platform="x",
            keyword=keyword,
            platform_video_id=f"status:x:{keyword}",
            title=title,
            raw_json={"default_query": query, "max_results": max_results},
            source_status=source_status,
        )
    ]


def _x_error(status_code: int, payload: Any) -> tuple[str, str]:
    raw = str(payload).lower()
    if status_code in {402, 403} and any(term in raw for term in ["credit", "usage", "cap", "payment"]):
        return "x_credits_insufficient", "X API credits are insufficient."
    if status_code in {401, 403}:
        return "x_permission_denied", "X API permission is insufficient."
    if status_code == 429:
        return "x_rate_limited", "X API rate limit reached."
    return "x_request_failed", "X API request failed."


def _tweet_url(tweet_id: str) -> str:
    return f"https://x.com/i/web/status/{tweet_id}"


def _to_record(tweet: dict[str, Any], keyword: str) -> VideoRecordDTO:
    metrics = tweet.get("public_metrics") or {}
    text = tweet.get("text") or ""
    tweet_id = str(tweet.get("id") or "")
    view_count = metrics.get("impression_count")
    return VideoRecordDTO(
        platform="x",
        keyword=keyword,
        platform_video_id=tweet_id,
        title=text,
        author_name=tweet.get("author_id"),
        video_url=_tweet_url(tweet_id),
        published_at=tweet.get("created_at"),
        view_count=int(view_count) if view_count is not None else None,
        like_count=metrics.get("like_count"),
        comment_count=metrics.get("reply_count"),
        share_count=metrics.get("retweet_count"),
        favorite_count=metrics.get("bookmark_count"),
        raw_json=tweet,
        source_status="ok",
    )


class XAdapter(BasePlatformAdapter):
    platform = "x"

    async def search_videos(self, keyword: str, max_results: int, date_start: str | None, date_end: str | None):
        query = f"{keyword} has:videos"
        settings = get_settings()
        capped_results = max(10, min(max_results, settings.x_max_results_limit))
        if not settings.x_bearer_token:
            return _status_record(keyword, query, capped_results, "x_bearer_token_missing", "X_BEARER_TOKEN is not configured")
        params: dict[str, str | int] = {
            "query": query,
            "max_results": capped_results,
            "tweet.fields": "created_at,public_metrics,attachments,entities,author_id",
        }
        if date_start:
            params["start_time"] = f"{date_start}T00:00:00Z"
        if date_end:
            params["end_time"] = f"{date_end}T23:59:59Z"
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.get(
                    SEARCH_ENDPOINT,
                    params=params,
                    headers={"Authorization": f"Bearer {settings.x_bearer_token}"},
                )
        except httpx.HTTPError:
            return _status_record(keyword, query, capped_results, "x_request_failed", "X API request failed.")
        if response.status_code >= 400:
            try:
                payload: Any = response.json()
            except ValueError:
                payload = {"message": response.text}
            source_status, title = _x_error(response.status_code, payload)
            return [
                VideoRecordDTO(
                    platform=self.platform,
                    keyword=keyword,
                    platform_video_id=f"status:{self.platform}:{keyword}:{datetime.now(timezone.utc).timestamp()}",
                    title=title,
                    raw_json={"default_query": query, "max_results": capped_results, "status_code": response.status_code},
                    source_status=source_status,
                )
            ]
        payload = response.json()
        tweets = payload.get("data") or []
        if not tweets:
            return _status_record(keyword, query, capped_results, "x_no_results", "No X videos found.")
        return [_to_record(tweet, keyword) for tweet in tweets]
