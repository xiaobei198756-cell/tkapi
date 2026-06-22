from app.schemas import VideoRecordDTO
from app.services.platforms.base import BasePlatformAdapter


class FacebookAdapter(BasePlatformAdapter):
    platform = "facebook"

    async def search_videos(self, keyword: str, max_results: int, date_start: str | None, date_end: str | None):
        return [
            VideoRecordDTO(
                platform=self.platform,
                keyword=keyword,
                platform_video_id=f"status:{self.platform}:{keyword}",
                title="Facebook Graph API credentials are not configured",
                raw_json={"required_env": ["META_ACCESS_TOKEN", "FB_PAGE_IDS"]},
                source_status="facebook_credentials_missing",
            )
        ]
