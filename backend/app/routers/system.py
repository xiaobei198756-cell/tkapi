from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["system"])


def _status(platform: str, configured: bool, available: bool, message: str, status: str | None = None) -> dict[str, bool | str]:
    return {
        "platform": platform,
        "configured": configured,
        "available": available,
        "status": status or ("available" if available else "not_configured"),
        "message": message,
    }


def _x_status() -> dict[str, bool | str]:
    settings = get_settings()
    has_bearer_token = bool(settings.x_bearer_token)
    return {
        "platform": "x",
        "configured": has_bearer_token,
        "available": has_bearer_token,
        "has_bearer_token": has_bearer_token,
        "has_api_key": bool(settings.x_api_key),
        "has_api_secret": bool(settings.x_api_secret),
        "has_access_token": bool(settings.x_access_token),
        "has_access_token_secret": bool(settings.x_access_token_secret),
        "status": "available" if has_bearer_token else "not_configured",
        "message": "Available" if has_bearer_token else "Not configured",
    }


def _x_error_status(status_code: int, payload: dict[str, Any]) -> dict[str, bool | str]:
    raw = str(payload).lower()
    if status_code in {402, 403} and any(term in raw for term in ["credit", "usage", "cap", "payment"]):
        status = "credits_insufficient"
        message = "Credits required"
    elif status_code in {401, 403}:
        status = "permission_denied"
        message = "Permission denied"
    elif status_code == 429:
        status = "rate_limited"
        message = "X API rate limit"
    else:
        status = "request_failed"
        message = "X API request failed"
    return {
        **_x_status(),
        "available": False,
        "status": status,
        "message": message,
    }


async def _x_live_status() -> dict[str, bool | str]:
    settings = get_settings()
    if not settings.x_bearer_token:
        return _x_status()
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(
                "https://api.twitter.com/2/tweets/search/recent",
                params={"query": "has:videos", "max_results": 10},
                headers={"Authorization": f"Bearer {settings.x_bearer_token}"},
            )
    except httpx.HTTPError:
        return {**_x_status(), "available": False, "status": "request_failed", "message": "X API request failed"}
    if response.status_code >= 400:
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text}
        return _x_error_status(response.status_code, payload)
    return {**_x_status(), "available": True, "status": "available", "message": "Available"}


def _tiktok_status() -> dict[str, bool | str]:
    settings = get_settings()
    has_client_key = bool(getattr(settings, "tiktok_client_key", None))
    has_client_secret = bool(getattr(settings, "tiktok_client_secret", None))
    provider = "official"
    has_oauth_config = bool(has_client_key and has_client_secret)
    if not has_oauth_config:
        return {
            "platform": "tiktok",
            "has_client_key": has_client_key,
            "has_client_secret": has_client_secret,
            "provider": provider,
            "configured": False,
            "available": False,
            "keyword_search_enabled": False,
            "status": "not_configured",
            "message": "Not configured",
        }
    return {
        "platform": "tiktok",
        "has_client_key": has_client_key,
        "has_client_secret": has_client_secret,
        "provider": provider,
        "configured": True,
        "available": False,
        "keyword_search_enabled": False,
        "status": "api_not_approved",
        "message": "API not approved",
    }


def _youtube_config_status() -> dict[str, bool | str]:
    settings = get_settings()
    configured = bool(settings.youtube_api_key)
    return _status(
        "youtube",
        configured,
        configured,
        "Available" if configured else "Not configured",
    )


def _youtube_error_message(payload: dict[str, Any]) -> tuple[str, str]:
    errors = payload.get("error", {}).get("errors", [])
    reason = errors[0].get("reason") if errors else payload.get("error", {}).get("status")
    if reason in {"quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"}:
        return "quota_insufficient", "YouTube API quota is insufficient or exhausted."
    return "request_failed", payload.get("error", {}).get("message") or "YouTube API request failed."


async def _youtube_live_status() -> dict[str, bool | str]:
    settings = get_settings()
    if not settings.youtube_api_key:
        return _youtube_config_status()
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "part": "id",
                    "chart": "mostPopular",
                    "maxResults": 1,
                    "regionCode": "US",
                    "key": settings.youtube_api_key,
                },
            )
    except httpx.HTTPError:
        return _status("youtube", True, False, "YouTube API request failed.", "request_failed")
    if response.status_code >= 400:
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        status, message = _youtube_error_message(payload)
        return _status("youtube", True, False, message, status)
    return _status("youtube", True, True, "YouTube API key configured", "available")


@router.get("/health")
def api_health() -> dict[str, str]:
    return {"status": "ok", "service": "tkapi", "message": "server is running"}


@router.get("/platform-status")
def platform_status() -> dict[str, dict[str, bool | str]]:
    return {
        "youtube": _youtube_config_status(),
        "x": _x_status(),
        "tiktok": _tiktok_status(),
        "instagram": _status("instagram", False, False, "Coming soon", "coming_soon"),
        "facebook": _status("facebook", False, False, "Coming soon", "coming_soon"),
    }


@router.get("/youtube/status")
async def youtube_status() -> dict[str, bool | str]:
    return await _youtube_live_status()


@router.get("/x/status")
async def x_status() -> dict[str, bool | str]:
    return await _x_live_status()
