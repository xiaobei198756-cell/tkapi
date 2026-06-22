from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models import CollectionJob, VideoRecord
from app.schemas import VideoRecordDTO
from app.services.platforms import FacebookAdapter, InstagramAdapter, TikTokAdapter, XAdapter, YouTubeAdapter
from app.services.platforms.base import AdapterNotConfigured, BasePlatformAdapter
from app.services.websocket_manager import manager
from app.services.x_billing import latest_balance, record_x_usage


ADAPTERS: dict[str, BasePlatformAdapter] = {
    "youtube": YouTubeAdapter(),
    "tiktok": TikTokAdapter(),
    "x": XAdapter(),
    "instagram": InstagramAdapter(),
    "facebook": FacebookAdapter(),
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _dump_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def _load_json_list(value: str | None) -> list[str]:
    if not value:
        return []
    data = json.loads(value)
    return [str(item).strip() for item in data if str(item).strip()]


async def _broadcast(job_id: str, **payload: object) -> None:
    await manager.broadcast(job_id, {"job_id": job_id, "timestamp": utc_now().isoformat(), **payload})


def _upsert_video(db: Session, job_id: str, dto: VideoRecordDTO) -> None:
    existing = db.execute(
        select(VideoRecord).where(
            VideoRecord.platform == dto.platform,
            VideoRecord.platform_video_id == dto.platform_video_id,
            VideoRecord.keyword == dto.keyword,
        )
    ).scalar_one_or_none()

    values = {
        "job_id": job_id,
        "platform": dto.platform,
        "keyword": dto.keyword,
        "platform_video_id": dto.platform_video_id,
        "title": dto.title,
        "author_name": dto.author_name,
        "author_url": dto.author_url,
        "video_url": dto.video_url,
        "thumbnail_url": dto.thumbnail_url,
        "published_at": dto.published_at,
        "duration": dto.duration,
        "view_count": dto.view_count,
        "like_count": dto.like_count,
        "favorite_count": dto.favorite_count,
        "comment_count": dto.comment_count,
        "share_count": dto.share_count,
        "raw_json": _dump_json(dto.raw_json),
        "source_status": dto.source_status,
        "collected_at": utc_now(),
        "updated_at": utc_now(),
    }

    if existing:
        for key, value in values.items():
            setattr(existing, key, value)
    else:
        db.add(VideoRecord(**values))


async def run_collection_job(job_id: str) -> None:
    db = SessionLocal()
    failures: list[str] = []
    inserted_count = 0
    try:
        job = db.get(CollectionJob, job_id)
        if not job:
            return

        keywords = _load_json_list(job.keywords_json)
        platforms = _load_json_list(job.platforms_json)
        total_steps = max(1, len(keywords) * len(platforms))
        completed_steps = 0

        job.status = "running"
        job.error_message = None
        job.updated_at = utc_now()
        db.commit()
        await _broadcast(job_id, status="running", completed=0, total=total_steps, message="Collection started.")

        for platform in platforms:
            adapter = ADAPTERS.get(platform)
            if not adapter:
                failures.append(f"{platform}: unsupported platform")
                completed_steps += len(keywords)
                continue

            for keyword in keywords:
                try:
                    await _broadcast(
                        job_id,
                        status="running",
                        platform=platform,
                        keyword=keyword,
                        completed=completed_steps,
                        total=total_steps,
                        message=f"Collecting {platform} / {keyword}",
                    )
                    records = await adapter.search_videos(
                        keyword=keyword,
                        max_results=job.max_results,
                        date_start=job.date_start,
                        date_end=job.date_end,
                    )
                    if platform == "x":
                        ok_records = [record for record in records if record.source_status == "ok"]
                        error_records = [record for record in records if record.source_status != "ok"]
                        record_x_usage(
                            db,
                            job_id=job_id,
                            keyword=keyword,
                            endpoint="GET /2/tweets/search/recent",
                            posts_returned=len(ok_records),
                            users_returned=0,
                            status="ok" if ok_records else (error_records[0].source_status if error_records else "no_results"),
                            error_message=error_records[0].title if error_records else None,
                        )
                    for record in records:
                        _upsert_video(db, job_id, record)
                    db.commit()
                    inserted_count += len(records)
                    completed_steps += 1
                    extra_message = ""
                    if platform == "x":
                        ok_records = [record for record in records if record.source_status == "ok"]
                        balance = latest_balance(db)
                        x_cost = len(ok_records) * get_settings().x_post_read_unit_cost
                        extra_message = f" X request completed. Posts returned: {len(ok_records)}. Estimated cost: ${x_cost:.2f}. Estimated remaining balance: ${balance:.2f}."
                    await _broadcast(
                        job_id,
                        status="running",
                        platform=platform,
                        keyword=keyword,
                        completed=completed_steps,
                        total=total_steps,
                        message=f"{platform} / {keyword}: {len(records)} records collected.{extra_message}",
                    )
                except AdapterNotConfigured as exc:
                    db.rollback()
                    failures.append(f"{exc.platform}: {exc.source_status} - {exc.detail}")
                    completed_steps += 1
                    await _broadcast(
                        job_id,
                        status="warning",
                        platform=platform,
                        keyword=keyword,
                        completed=completed_steps,
                        total=total_steps,
                        source_status=exc.source_status,
                        message=exc.detail,
                    )
                except Exception as exc:
                    db.rollback()
                    failures.append(f"{platform}/{keyword}: {exc}")
                    completed_steps += 1
                    await _broadcast(
                        job_id,
                        status="error",
                        platform=platform,
                        keyword=keyword,
                        completed=completed_steps,
                        total=total_steps,
                        message=str(exc),
                    )

        job = db.get(CollectionJob, job_id)
        if job:
            job.status = "partial_failed" if failures and inserted_count else ("failed" if failures else "success")
            job.error_message = "\n".join(failures) if failures else None
            job.updated_at = utc_now()
            db.commit()
            await _broadcast(
                job_id,
                status=job.status,
                completed=total_steps,
                total=total_steps,
                message=f"Collection finished. Records collected: {inserted_count}.",
                error_message=job.error_message,
            )
    finally:
        db.close()
