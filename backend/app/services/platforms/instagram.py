from app.schemas import VideoRecordDTO
from app.services.platforms.base import BasePlatformAdapter


class InstagramAdapter(BasePlatformAdapter):
    platform = "instagram"

    async def search_videos(self, keyword: str, max_results: int, date_start: str | None, date_end: str | None):
        return [
            VideoRecordDTO(
                platform=self.platform,
                keyword=keyword,
                platform_video_id=f"status:{self.platform}:{keyword}",
                title="Instagram Graph API credentials are not configured",
                raw_json={"required_env": ["META_ACCESS_TOKEN", "IG_USER_ID"]},
                source_status="instagram_credentials_missing",
            )
        ]
