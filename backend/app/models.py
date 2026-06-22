import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CollectionJob(Base):
    __tablename__ = "collection_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    keywords_json: Mapped[str] = mapped_column(Text, nullable=False)
    platforms_json: Mapped[str] = mapped_column(Text, nullable=False)
    max_results: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    date_start: Mapped[str | None] = mapped_column(String(10), nullable=True)
    date_end: Mapped[str | None] = mapped_column(String(10), nullable=True)
    refresh_interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    videos: Mapped[list["VideoRecord"]] = relationship(back_populates="job")


class VideoRecord(Base):
    __tablename__ = "video_records"
    __table_args__ = (
        UniqueConstraint("platform", "platform_video_id", "keyword", name="uq_platform_video_keyword"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str | None] = mapped_column(ForeignKey("collection_jobs.id"), nullable=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    keyword: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    platform_video_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    author_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    author_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(64), nullable=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    like_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    favorite_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    share_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_status: Mapped[str] = mapped_column(String(255), nullable=False, default="ok")
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    job: Mapped[CollectionJob | None] = relationship(back_populates="videos")

    @property
    def heat_score(self) -> int:
        base_score = (self.view_count or 0) + (self.like_count or 0) * 5 + (self.comment_count or 0) * 10
        if self.platform == "x":
            return base_score + (self.share_count or 0) * 8
        if self.platform == "tiktok":
            return base_score + (self.share_count or 0) * 8 + (self.favorite_count or 0) * 6
        return base_score

    @property
    def error_message(self) -> str | None:
        return self.title if self.source_status != "ok" else None


class XUsageLedger(Base):
    __tablename__ = "x_usage_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    keyword: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    posts_returned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    users_returned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_post_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estimated_user_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estimated_total_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    balance_before: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    balance_after: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="ok")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class XBillingBalance(Base):
    __tablename__ = "x_billing_balance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    balance_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
