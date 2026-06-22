from app.config import get_settings
from app.schemas import VideoRecordDTO
from app.services.platforms.base import BasePlatformAdapter


class TikTokAdapter(BasePlatformAdapter):
    platform = "tiktok"

    async def search_videos(self, keyword: str, max_results: int, date_start: str | None, date_end: str | None):
        settings = get_settings()
        if not (settings.tiktok_client_key and settings.tiktok_client_secret):
            source_status = "tiktok_not_configured"
            title = "TikTok API credentials are not configured"
        else:
            source_status = "tiktok_api_not_approved"
            title = "TikTok keyword search requires approved official Research API access"
        return [
            VideoRecordDTO(
                platform=self.platform,
                keyword=keyword,
                platform_video_id=f"status:{self.platform}:{keyword}",
                title=title,
                raw_json={
                    "required_env": ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
                    "api_provider": "official",
                },
                source_status=source_status,
            )
        ]
