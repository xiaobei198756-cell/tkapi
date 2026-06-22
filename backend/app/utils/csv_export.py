import csv
from io import StringIO
from app.models import VideoRecord


CSV_COLUMNS = [
    "platform",
    "keyword",
    "video_url",
    "title",
    "author",
    "published_at",
    "likes",
    "comments",
    "favorites",
    "shares",
    "collected_at",
]


def videos_to_csv(rows: list[VideoRecord], x_costs: dict[tuple[str | None, str], float] | None = None) -> str:
    x_costs = x_costs or {}
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                "platform": row.platform,
                "keyword": row.keyword,
                "video_url": row.video_url,
                "title": row.title,
                "author": row.author_name,
                "published_at": row.published_at,
                "likes": row.like_count,
                "comments": row.comment_count,
                "favorites": row.favorite_count,
                "shares": row.share_count,
                "collected_at": row.collected_at,
            }
        )
    return "\ufeff" + output.getvalue()
