# Project Overview

TKAPI is a multi-platform video data collection and ranking project served at https://tkapi.onrender.com.

The active project is organized as:

```text
backend/     FastAPI API service and platform adapters
frontend/    React/Vite web app
scripts/     Command-line collector wrappers
deployment/  Render and server deployment notes
docs/        Project documentation
archive/     Old source snapshots for reference only
```

Target fields are normalized across platforms:

```text
platform, keyword, video_url, title, author, published_at,
likes, comments, favorites, shares, collected_at
```

TikTok collection in the active project uses official TikTok APIs only. Archived code may contain historical third-party experiments and must not be imported into active runtime paths.
