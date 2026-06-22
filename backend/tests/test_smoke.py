import asyncio
from types import SimpleNamespace

from sqlalchemy import inspect
from fastapi.testclient import TestClient

from app.database import Base, engine, init_db
from app.main import app
from app.models import VideoRecord
from app.services.platforms.youtube import YouTubeAdapter


def test_app_imports() -> None:
    assert app.title == "Social Video Tracker"


def test_api_health() -> None:
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "social-video-tracker"}


def test_platform_status() -> None:
    client = TestClient(app)
    response = client.get("/api/platform-status")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"youtube", "x", "tiktok", "instagram", "facebook"}
    assert "configured" in payload["youtube"]
    assert "message" in payload["youtube"]


def test_x_status_without_bearer_token(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.routers.system.get_settings",
        lambda: SimpleNamespace(
            x_bearer_token=None,
            x_api_key=None,
            x_api_secret=None,
            x_access_token=None,
            x_access_token_secret=None,
        ),
    )
    client = TestClient(app)
    response = client.get("/api/x/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["configured"] is False
    assert payload["has_bearer_token"] is False
    assert payload["message"] == "Not configured"
    assert "X_BEARER_TOKEN" not in payload


def test_youtube_search_without_api_key_returns_clear_error(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.routers.youtube.get_settings",
        lambda: SimpleNamespace(youtube_api_key=None),
    )
    client = TestClient(app)
    response = client.get("/api/youtube/search", params={"keyword": "crypto", "max_results": 5})
    assert response.status_code == 400
    assert "API Key is not configured" in response.json()["detail"]


def test_database_tables_can_be_created() -> None:
    init_db()
    table_names = set(inspect(engine).get_table_names())
    assert {"collection_jobs", "video_records"}.issubset(table_names)
    assert Base.metadata.tables["video_records"].name == "video_records"


def test_video_heat_score_property() -> None:
    video = VideoRecord(
        platform="youtube",
        keyword="crypto",
        platform_video_id="abc",
        view_count=100,
        like_count=5,
        comment_count=2,
        source_status="ok",
    )
    assert video.heat_score == 145


def test_youtube_adapter_without_api_key_returns_source_status(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.platforms.youtube.get_settings",
        lambda: SimpleNamespace(youtube_api_key=None),
    )

    records = asyncio.run(
        YouTubeAdapter().search_videos(
            keyword="openai",
            max_results=1,
            date_start=None,
            date_end=None,
        )
    )

    assert records
    assert records[0].source_status == "youtube_api_key_missing"
    assert records[0].platform_video_id == "status:youtube:openai"
