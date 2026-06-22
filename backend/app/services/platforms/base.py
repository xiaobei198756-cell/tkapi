from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas import VideoRecordDTO


class AdapterNotConfigured(RuntimeError):
    def __init__(self, platform: str, source_status: str, detail: str) -> None:
        super().__init__(detail)
        self.platform = platform
        self.source_status = source_status
        self.detail = detail


class BasePlatformAdapter(ABC):
    platform: str

    @abstractmethod
    async def search_videos(
        self,
        keyword: str,
        max_results: int,
        date_start: str | None,
        date_end: str | None,
    ) -> list[VideoRecordDTO]:
        raise NotImplementedError
