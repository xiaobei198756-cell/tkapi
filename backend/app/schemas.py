from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


PlatformName = str


class JobCreate(BaseModel):
    keywords: list[str] = Field(min_length=1)
    platforms: list[PlatformName] = Field(min_length=1)
    max_results: int = Field(default=50, ge=1, le=100)
    date_start: str | None = None
    date_end: str | None = None
    refresh_interval_minutes: int | None = Field(default=None, ge=1)


class JobCreated(BaseModel):
    id: str
    status: str


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    keywords_json: str
    platforms_json: str
    max_results: int
    date_start: str | None
    date_end: str | None
    refresh_interval_minutes: int | None
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class VideoRecordDTO(BaseModel):
    platform: str
    keyword: str
    platform_video_id: str
    title: str | None = None
    author_name: str | None = None
    author_url: str | None = None
    video_url: str | None = None
    thumbnail_url: str | None = None
    published_at: str | None = None
    duration: str | None = None
    view_count: int | None = None
    like_count: int | None = None
    favorite_count: int | None = None
    comment_count: int | None = None
    share_count: int | None = None
    raw_json: dict | str | None = None
    source_status: str = "ok"


class VideoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    keyword: str
    video_url: str | None = None
    title: str | None = None
    author: str | None = None
    published_at: str | None = None
    likes: int | None = None
    comments: int | None = None
    favorites: int | None = None
    shares: int | None = None
    collected_at: datetime

    @model_validator(mode="before")
    @classmethod
    def normalize_video_record(cls, value: Any) -> Any:
        if isinstance(value, dict):
            source = value
            getter = source.get
        else:
            getter = lambda key, default=None: getattr(value, key, default)

        return {
            "id": getter("id"),
            "platform": getter("platform"),
            "keyword": getter("keyword"),
            "video_url": getter("video_url"),
            "title": getter("title"),
            "author": getter("author", getter("author_name")),
            "published_at": getter("published_at"),
            "likes": getter("likes", getter("like_count")),
            "comments": getter("comments", getter("comment_count")),
            "favorites": getter("favorites", getter("favorite_count")),
            "shares": getter("shares", getter("share_count")),
            "collected_at": getter("collected_at"),
        }


class VideoListResponse(BaseModel):
    items: list[VideoRead]
    total: int


class YouTubeSearchItem(BaseModel):
    platform: str
    keyword: str
    video_url: str
    title: str | None = None
    author: str | None = None
    published_at: str | None = None
    likes: int | None = None
    comments: int | None = None
    favorites: int | None = None
    shares: int | None = None
    collected_at: str


class YouTubeSearchResponse(BaseModel):
    keyword: str
    total: int
    items: list[YouTubeSearchItem]
    message: str | None = None


class KeywordSearchRequest(BaseModel):
    keyword: str = Field(min_length=1)
    platforms: list[str] = Field(default_factory=lambda: ["youtube"])
    min_views: int | None = Field(default=None, ge=0)
    min_likes: int | None = Field(default=None, ge=0)
    date_range: str | None = None
    limit: int = Field(default=50, ge=1, le=100)


class KeywordSearchItem(BaseModel):
    platform: str
    keyword: str
    video_url: str | None = None
    title: str | None = None
    author: str | None = None
    published_at: str | None = None
    likes: int | None = None
    comments: int | None = None
    favorites: int | None = None
    shares: int | None = None
    collected_at: str
    message: str | None = None


class KeywordSearchResponse(BaseModel):
    items: list[KeywordSearchItem]
    warnings: list[str] = Field(default_factory=list)


class JobProgressEvent(BaseModel):
    job_id: str
    platform: str | None = None
    keyword: str | None = None
    status: str
    progress: int
    message: str
