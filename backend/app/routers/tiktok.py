from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

import httpx
from dotenv import dotenv_values
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.config import BACKEND_DIR, reload_settings, get_settings
from app.services.tiktok_token_store import create_state, public_status, read_token, save_token, validate_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tiktok", tags=["tiktok"])

AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
VIDEO_FIELDS = ",".join(
    [
        "id",
        "title",
        "video_description",
        "create_time",
        "share_url",
        "cover_image_url",
        "duration",
        "like_count",
        "comment_count",
        "share_count",
        "view_count",
    ]
)


class VideoQueryRequest(BaseModel):
    video_ids: list[str] = Field(min_length=1)


def _read_tiktok_env() -> dict[str, str | None]:
    values = dotenv_values(BACKEND_DIR / ".env")
    return {
        "client_key": values.get("TIKTOK_CLIENT_KEY") or None,
        "client_secret": values.get("TIKTOK_CLIENT_SECRET") or None,
        "access_token": values.get("TIKTOK_ACCESS_TOKEN") or None,
        "provider": values.get("TIKTOK_API_PROVIDER") or None,
    }


def _settings_or_error():
    settings = get_settings()
    missing = [
        name
        for name, value in {
            "TIKTOK_CLIENT_KEY": settings.tiktok_client_key,
            "TIKTOK_CLIENT_SECRET": settings.tiktok_client_secret,
            "TIKTOK_REDIRECT_URI": settings.tiktok_redirect_uri,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing TikTok OAuth configuration: {', '.join(missing)}")
    return settings


def _token_or_error() -> dict[str, Any]:
    token = read_token()
    if not token or not token.get("access_token"):
        raise HTTPException(status_code=401, detail="TikTok is not connected. Complete OAuth authorization first.")
    return token


def _tiktok_error(response: httpx.Response) -> HTTPException:
    try:
        payload = response.json()
    except ValueError:
        payload = {"message": response.text}
    message = (
        payload.get("error", {}).get("message")
        or payload.get("error_description")
        or payload.get("message")
        or "TikTok API request failed."
    )
    code = payload.get("error", {}).get("code") or payload.get("error")
    detail = f"TikTok API error: {message}"
    if response.status_code in {401, 403}:
        detail += " Check token expiration and ensure required scopes are approved in TikTok Developer Center."
    logger.warning("TikTok API error status=%s code=%s payload=%s", response.status_code, code, payload)
    return HTTPException(status_code=response.status_code if response.status_code < 500 else 502, detail=detail)


async def _post_token_form(data: dict[str, str]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if response.status_code >= 400:
        raise _tiktok_error(response)
    payload = response.json()
    if not payload.get("access_token"):
        logger.error("TikTok token response missing access_token: %s", payload)
        raise HTTPException(status_code=502, detail="TikTok token response did not include access_token.")
    return payload


@router.get("/auth-url")
def auth_url() -> dict[str, str]:
    settings = _settings_or_error()
    state = create_state()
    query = urlencode(
        {
            "client_key": settings.tiktok_client_key,
            "scope": settings.tiktok_scopes,
            "response_type": "code",
            "redirect_uri": settings.tiktok_redirect_uri,
            "state": state,
        }
    )
    return {"auth_url": f"{AUTH_URL}?{query}", "state": state}


@router.get("/callback")
async def callback(code: str | None = None, state: str | None = None, error: str | None = None) -> RedirectResponse:
    settings = _settings_or_error()
    if error:
        logger.warning("TikTok OAuth callback error: %s", error)
        return RedirectResponse(f"{settings.frontend_url}?{urlencode({'tiktok_error': error})}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="TikTok callback requires code and state.")
    if not validate_state(state):
        raise HTTPException(status_code=400, detail="Invalid or expired TikTok OAuth state.")

    payload = await _post_token_form(
        {
            "client_key": settings.tiktok_client_key or "",
            "client_secret": settings.tiktok_client_secret or "",
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.tiktok_redirect_uri or "",
        }
    )
    save_token(payload)
    logger.info("TikTok OAuth connected open_id=%s scope=%s", payload.get("open_id"), payload.get("scope"))
    return RedirectResponse(f"{settings.frontend_url}?tiktok_connected=1")


def _safe_provider(settings: Any, explicit_provider: str | None = None) -> str:
    provider = (explicit_provider or getattr(settings, "tiktok_api_provider", None) or "").strip().lower()
    return "official" if provider in {"", "official"} else "official"


def _classify_token_error(status_code: int, payload: dict[str, Any]) -> tuple[str, str]:
    raw = str(payload).lower()
    if "client_key" in raw or "client key" in raw:
        return "client_key_invalid", "client key invalid"
    if "client_secret" in raw or "client secret" in raw:
        return "client_secret_invalid", "client secret invalid"
    if "invalid_client" in raw or status_code in {401, 403}:
        return "client_key_or_secret_invalid", "client key or client secret invalid"
    return "token_request_failed", "token request failed"


async def _client_token_check(settings: Any) -> tuple[str, str]:
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.post(
                TOKEN_URL,
                data={
                    "client_key": settings.tiktok_client_key or "",
                    "client_secret": settings.tiktok_client_secret or "",
                    "grant_type": "client_credentials",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except httpx.HTTPError:
        return "network_error", "network error"
    if response.status_code >= 400:
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text}
        return _classify_token_error(response.status_code, payload)
    return "api_not_approved", "API not approved"


@router.get("/status")
async def status() -> dict[str, Any]:
    settings = reload_settings()
    env_values = _read_tiktok_env()
    client_key = env_values["client_key"] or settings.tiktok_client_key
    client_secret = env_values["client_secret"] or settings.tiktok_client_secret
    has_client_key = bool(client_key)
    has_client_secret = bool(client_secret)
    oauth_configured = bool(has_client_key and has_client_secret)
    has_access_token = bool(env_values["access_token"] or settings.tiktok_access_token)
    provider = _safe_provider(settings, env_values["provider"])
    token_status = public_status()

    if not oauth_configured:
        return {
            **token_status,
            "platform": "tiktok",
            "has_client_key": has_client_key,
            "has_client_secret": has_client_secret,
            "has_access_token": has_access_token,
            "provider": provider,
            "configured": False,
            "available": False,
            "keyword_search_enabled": False,
            "status": "not_configured",
            "message": "Not configured",
        }
    settings.tiktok_client_key = client_key
    settings.tiktok_client_secret = client_secret
    token_status_code, message = await _client_token_check(settings)
    return {
        **token_status,
        "platform": "tiktok",
        "has_client_key": has_client_key,
        "has_client_secret": has_client_secret,
        "has_access_token": has_access_token,
        "provider": provider,
        "configured": True,
        "available": False,
        "keyword_search_enabled": False,
        "status": token_status_code,
        "message": message,
    }


@router.post("/token/refresh")
async def refresh_token() -> dict[str, Any]:
    settings = _settings_or_error()
    token = _token_or_error()
    refresh = token.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=400, detail="No TikTok refresh_token is saved. Reconnect TikTok.")
    payload = await _post_token_form(
        {
            "client_key": settings.tiktok_client_key or "",
            "client_secret": settings.tiktok_client_secret or "",
            "grant_type": "refresh_token",
            "refresh_token": refresh,
        }
    )
    if not payload.get("refresh_token"):
        payload["refresh_token"] = refresh
    save_token(payload)
    logger.info("TikTok token refreshed open_id=%s scope=%s", payload.get("open_id"), payload.get("scope"))
    return public_status()


@router.get("/user/videos")
async def user_videos(
    cursor: int | None = Query(default=None),
    max_count: int = Query(default=20, ge=1, le=20),
) -> dict[str, Any]:
    token = _token_or_error()
    body: dict[str, Any] = {"max_count": max_count}
    if cursor is not None:
        body["cursor"] = cursor
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"https://open.tiktokapis.com/v2/video/list/?fields={VIDEO_FIELDS}",
            headers={"Authorization": f"Bearer {token['access_token']}", "Content-Type": "application/json"},
            json=body,
        )
    if response.status_code >= 400:
        raise _tiktok_error(response)
    return response.json()


@router.post("/videos/query")
async def videos_query(payload: VideoQueryRequest) -> dict[str, Any]:
    token = _token_or_error()
    batches = [payload.video_ids[index : index + 20] for index in range(0, len(payload.video_ids), 20)]
    videos: list[dict[str, Any]] = []
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=20) as client:
        for batch in batches:
            response = await client.post(
                f"https://open.tiktokapis.com/v2/video/query/?fields={VIDEO_FIELDS}",
                headers={"Authorization": f"Bearer {token['access_token']}", "Content-Type": "application/json"},
                json={"filters": {"video_ids": batch}},
            )
            if response.status_code >= 400:
                exc = _tiktok_error(response)
                errors.append(str(exc.detail))
                continue
            data = response.json()
            videos.extend(data.get("data", {}).get("videos", []))
    if errors and not videos:
        raise HTTPException(status_code=502, detail="; ".join(errors))
    return {"videos": videos, "errors": errors}
