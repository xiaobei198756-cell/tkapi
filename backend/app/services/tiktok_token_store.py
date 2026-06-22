from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.config import BACKEND_DIR

TOKEN_FILE = BACKEND_DIR / ".tiktok_token.json"
STATE_FILE = BACKEND_DIR / ".tiktok_oauth_state.json"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


def create_state() -> str:
    state = secrets.token_urlsafe(32)
    _write_json(
        STATE_FILE,
        {
            "state": state,
            "expires_at": (utc_now() + timedelta(minutes=10)).isoformat(),
        },
    )
    return state


def validate_state(state: str) -> bool:
    saved = _read_json(STATE_FILE)
    if not saved or saved.get("state") != state:
        return False
    expires_at = datetime.fromisoformat(saved["expires_at"])
    if expires_at < utc_now():
        return False
    STATE_FILE.unlink(missing_ok=True)
    return True


def save_token(payload: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    token = {
        "open_id": payload.get("open_id"),
        "access_token": payload.get("access_token"),
        "refresh_token": payload.get("refresh_token"),
        "expires_in": payload.get("expires_in"),
        "refresh_expires_in": payload.get("refresh_expires_in"),
        "scope": payload.get("scope"),
        "token_type": payload.get("token_type"),
        "expires_at": (now + timedelta(seconds=int(payload.get("expires_in") or 0))).isoformat()
        if payload.get("expires_in")
        else None,
        "refresh_expires_at": (now + timedelta(seconds=int(payload.get("refresh_expires_in") or 0))).isoformat()
        if payload.get("refresh_expires_in")
        else None,
        "updated_at": now.isoformat(),
    }
    _write_json(TOKEN_FILE, token)
    return token


def read_token() -> dict[str, Any] | None:
    return _read_json(TOKEN_FILE)


def public_status() -> dict[str, Any]:
    token = read_token()
    if not token or not token.get("access_token"):
        return {"connected": False}
    return {
        "connected": True,
        "open_id": token.get("open_id"),
        "scope": token.get("scope"),
        "token_type": token.get("token_type"),
        "expires_at": token.get("expires_at"),
        "refresh_expires_at": token.get("refresh_expires_at"),
        "updated_at": token.get("updated_at"),
    }
