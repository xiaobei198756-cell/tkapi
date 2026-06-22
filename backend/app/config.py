from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = Path(__file__).resolve().parents[2]
ENV_FILES = (PROJECT_DIR / ".env", BACKEND_DIR / ".env")

for env_file in ENV_FILES:
    if env_file.exists():
        load_dotenv(env_file, override=True)


class Settings(BaseSettings):
    app_name: str = "Social Video Tracker"
    database_url: str = "sqlite:///./social_video_tracker.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"

    youtube_api_key: str | None = None
    x_bearer_token: str | None = None
    x_api_key: str | None = None
    x_api_secret: str | None = None
    x_access_token: str | None = None
    x_access_token_secret: str | None = None
    x_credit_balance_usd: float = 0.0
    x_post_read_unit_cost: float = 0.005
    x_user_read_unit_cost: float = 0.010
    x_max_results_limit: int = 50
    tiktok_client_key: str | None = None
    tiktok_client_secret: str | None = None
    tiktok_access_token: str | None = None
    tiktok_api_provider: str = "official"
    tiktok_redirect_uri: str | None = None
    tiktok_scopes: str = "user.info.basic,video.list"
    frontend_url: str = "http://localhost:5173"
    meta_access_token: str | None = None
    ig_user_id: str | None = None
    fb_page_ids: str | None = None

    request_timeout_seconds: float = 20.0
    adapter_max_retries: int = 2
    adapter_retry_base_seconds: float = 0.8

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def fb_page_id_list(self) -> list[str]:
        if not self.fb_page_ids:
            return []
        return [item.strip() for item in self.fb_page_ids.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reload_settings() -> Settings:
    for env_file in ENV_FILES:
        if env_file.exists():
            load_dotenv(env_file, override=True)
    get_settings.cache_clear()
    return get_settings()
