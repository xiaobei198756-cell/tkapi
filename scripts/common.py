from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.schemas import VideoRecordDTO  # noqa: E402


def build_parser(platform: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=f"Collect {platform} videos by keyword.")
    parser.add_argument("keyword", help="Keyword to search")
    parser.add_argument("--max-results", type=int, default=10, help="Maximum records to return")
    parser.add_argument("--date-start", default=None, help="YYYY-MM-DD lower bound")
    parser.add_argument("--date-end", default=None, help="YYYY-MM-DD upper bound")
    return parser


def normalize_record(record: VideoRecordDTO) -> dict[str, Any]:
    data = record.model_dump()
    return {
        "platform": data.get("platform"),
        "keyword": data.get("keyword"),
        "video_url": data.get("video_url"),
        "title": data.get("title"),
        "author": data.get("author_name"),
        "published_at": data.get("published_at"),
        "likes": data.get("like_count"),
        "comments": data.get("comment_count"),
        "favorites": data.get("favorite_count"),
        "shares": data.get("share_count"),
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }


async def run_adapter(adapter: Any, argv: list[str] | None = None) -> int:
    args = build_parser(adapter.platform).parse_args(argv)
    records = await adapter.search_videos(
        keyword=args.keyword,
        max_results=args.max_results,
        date_start=args.date_start,
        date_end=args.date_end,
    )
    print(json.dumps([normalize_record(record) for record in records], ensure_ascii=False, indent=2))
    return 0


def main(adapter: Any) -> None:
    raise SystemExit(asyncio.run(run_adapter(adapter)))
