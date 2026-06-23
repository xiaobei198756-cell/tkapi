# Social Video Tracker

Multi-platform video keyword collection system with a FastAPI backend and React/Vite frontend.

Windows local setup: see [RUNBOOK_WINDOWS.md](RUNBOOK_WINDOWS.md).

## Current Scope

- YouTube: real YouTube Data API v3 collection is implemented.
- X: official X API v2 recent-search collection is implemented when a valid bearer token and plan access are configured. Video intent is queried with `has:videos`, for example `crypto has:videos`.
- TikTok: active code keeps only official TikTok API/OAuth logic. Third-party TikTok API code is archived only and is not part of runtime.
- Instagram and Facebook: official Meta Graph API adapter scaffolds are present and return clear permission/configuration status until approved access is configured.
- Database: SQLite by default with SQLAlchemy models for jobs and video records.
- Frontend: home, keyword search, platform selection, ranking views, platform configuration status, job progress, video records, and CSV export.

## Structure

```text
social-video-tracker/
  archive/old_version/
    2026-05-31-tiktok/
    2026-05-31-tiktok-hot-monitor/
  backend/
    app/
      main.py config.py database.py models.py schemas.py
      routers/jobs.py videos.py export.py system.py
      services/collector.py websocket_manager.py
      services/platforms/base.py youtube.py tiktok.py x.py instagram.py facebook.py
      utils/csv_export.py rate_limit.py
    tests/test_smoke.py
    requirements.txt .env.example README.md
  frontend/
    src/main.tsx App.tsx api/client.ts components/JobForm.tsx JobProgress.tsx VideoTable.tsx PlatformStatus.tsx types.ts
    package.json vite.config.ts tailwind.config.js .env.example README.md SMOKE_TEST.md
  scripts/
    youtube_collector.py x_collector.py tiktok_collector.py instagram_collector.py facebook_collector.py
  deployment/
    RENDER.md ENVIRONMENT.md SERVER.md COMMANDS.md
  docs/
    PROJECT_OVERVIEW.md API_SETUP.md RENDER_DEPLOYMENT.md TROUBLESHOOTING.md CHANGELOG.md
  .env.example
  TODO.md
  render.yaml
```

## Windows Quick Start

Backend:

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open:

- Backend docs: http://127.0.0.1:8000/docs
- Frontend page: http://localhost:5173/

## Remotion Video

The `remotion-video/` directory contains a standalone Remotion composition for
previewing and rendering a 10-second, 1920x1080 social metrics video at 30fps.

Install its dependencies from the project root:

```powershell
npm run remotion:install
```

Start Remotion Studio:

```powershell
npm run remotion:dev
```

Render `remotion-video/out/social-metrics.mp4`:

```powershell
npm run remotion:render
```

## First-Time Backend Setup

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
pytest
```

Expected smoke test result:

```text
5 passed
```

## Frontend Configuration

The frontend defaults to:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

You can copy `frontend/.env.example` to `frontend/.env.local` if you need to override it.

## API Checks

- `GET http://127.0.0.1:8000/api/health` returns `{"status":"ok","service":"social-video-tracker"}`.
- `GET http://127.0.0.1:8000/api/platform-status` returns configuration status for YouTube, X, TikTok, Instagram, and Facebook.
- `GET http://127.0.0.1:8000/docs` opens the interactive backend docs.
- `GET /api/health` returns `{"status":"ok","service":"social-video-tracker"}`.
- `GET /api/platform-status` returns configuration status for YouTube, X, TikTok, Instagram, and Facebook.
- `POST /api/jobs` accepts `keywords`, `platforms`, `max_results`, `date_start`, `date_end`, and `refresh_interval_minutes`.
- `POST /api/search/keywords` accepts one keyword plus selected platforms and returns a unified ranking payload.
- `GET /api/videos` lists collected videos.
- `GET /api/export/csv` exports collected videos.
- `WS /ws/jobs/{job_id}` streams progress.

Example job payload:

```json
{
  "keywords": ["crypto", "ai news"],
  "platforms": ["youtube"],
  "max_results": 5,
  "date_start": null,
  "date_end": null,
  "refresh_interval_minutes": 30
}
```

## YouTube Real API Test

The backend reads `YOUTUBE_API_KEY` from environment variables, project-root `.env`, or `backend/.env`. Do not hard-code the key in source code.

1. Open `backend/.env` or project-root `.env`.
2. Add your API key:

```text
YOUTUBE_API_KEY=your_YouTube_API_Key
```

3. Restart the backend.
4. Open the frontend at http://localhost:5173/.
5. Enter keywords, for example:

```text
crypto
ai news
football highlights
```

6. Select only YouTube.
7. Set `max_results` to `5`.
8. Click Start collection.
9. Confirm the video table shows platform, keyword, video URL, title, author, published time, likes, comments, favorites, shares, and collected time.

You can also test the direct YouTube search endpoint:

```text
http://127.0.0.1:8000/api/youtube/search?keyword=crypto&max_results=5
```

Expected JSON fields:

- `platform`
- `keyword`
- `video_url`
- `title`
- `author`
- `published_at`
- `likes`
- `comments`
- `favorites`
- `shares`
- `collected_at`

Frontend collection flow:

1. Open http://localhost:5173/.
2. Use the Collection Setup panel.
3. Enter `crypto` or `ai news`.
4. Select only YouTube.
5. Set max results to `5`.
6. Click Start collection.
7. Expected: the Video Records table shows ranking, platform, keyword, video URL, title, author, published time, likes, comments, favorites, shares, and collected time.

Possible errors:

- `API Key is not configured`: set `YOUTUBE_API_KEY` and restart the backend.
- `API request failed`: check network access and the backend terminal.
- `No videos found`: try another keyword.
- `YouTube API quota is insufficient`: wait for quota reset or use another valid quota-enabled key.

## Local Acceptance Flow

1. Start backend:

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

2. Open backend checks:

- http://127.0.0.1:8000/api/health
- http://127.0.0.1:8000/api/platform-status
- http://127.0.0.1:8000/docs

3. Start frontend:

```powershell
cd frontend
npm install
npm run dev
```

4. Open http://localhost:5173/.

5. The frontend should show platform configuration status, keyword input, platform multi-select, start collection button, progress panel, video table, and CSV export button.

## Platform Field Notes

All platform collector results exposed by the API, ranking UI, and `scripts/` output use the same public fields: `platform`, `keyword`, `video_url`, `title`, `author`, `published_at`, `likes`, `comments`, `favorites`, `shares`, and `collected_at`.

- YouTube: implemented via YouTube Data API v3; unavailable `favorites` and `shares` values are `null`.
- X: official API search uses `keyword has:videos`; fields unavailable through the granted API plan are `null`.
- TikTok: requires approved official API access; unavailable fields are `null`.
- Instagram: requires Meta Graph API permissions; keyword-wide search is permission-limited and unavailable fields are `null`.
- Facebook: requires Meta Graph API permissions for owned pages or approved public content access; unavailable fields are `null`.

Internal database and adapter names may still use platform-native fields such as `like_count` or `author_name`, but those names are converted before data leaves the backend.

## Compliance

This project uses official API paths only. It does not implement unsupported access methods, credential misuse, proxy-based evasion, or automated simulated user login. Fields unavailable from a platform API are stored as `null`, and permission/configuration gaps are surfaced through `source_status` and `/api/platform-status`.

## TikTok Official API Setup

Add these values to `backend/.env` or the project-root `.env`:

```text
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_API_PROVIDER=official
TIKTOK_REDIRECT_URI=https://your-domain.com/api/tiktok/callback
TIKTOK_SCOPES=user.info.basic,video.list
FRONTEND_URL=http://localhost:5173
```

The TikTok Developer Center Redirect URI must exactly match `TIKTOK_REDIRECT_URI`.
TikTok keyword search requires official TikTok Research API / keyword search permission approval.
Do not configure third-party TikTok variables such as `TIKTOK_API_TOKEN` or `TIKTOK_API_BASE_URL` in the active project.

Backend endpoints:

- `GET /api/tiktok/auth-url`
- `GET /api/tiktok/callback`
- `GET /api/tiktok/status`
- `POST /api/tiktok/token/refresh`
- `GET /api/tiktok/user/videos`
- `POST /api/tiktok/videos/query`

Frontend flow:

1. Start backend and frontend.
2. Open `http://localhost:5173/`.
3. In TikTok API Settings, click Connect TikTok Account.
4. Complete TikTok OAuth.
5. Return to the frontend and click Get My Videos.

Tokens are saved only on the backend in `backend/.tiktok_token.json`, which is ignored by Git. The frontend never receives `access_token`, `refresh_token`, or `client_secret`.

## X API Billing Estimate

Add these optional values to `backend/.env` to enable local X API cost estimates:

```text
X_CREDIT_BALANCE_USD=0
X_POST_READ_UNIT_COST=0.005
X_USER_READ_UNIT_COST=0.010
X_MAX_RESULTS_LIMIT=50
```

`X_CREDIT_BALANCE_USD` is a manually entered local balance from your X Developer Console. The backend does not expose `X_BEARER_TOKEN` to the frontend and cannot guarantee the real X account balance.

Billing endpoints:

- `GET /api/x/billing/status`
- `GET /api/x/billing/usage`
- `POST /api/x/billing/balance`
- `GET /api/x/usage/official`

Example balance sync:

```json
{
  "balance_usd": 10
}
```

X usage estimates are stored in `x_usage_ledger`. The official usage endpoint is only for reference and reconciliation; failures do not affect YouTube collection.

## TKAPI Render Deployment

Public app URL:

```text
https://tkapi.onrender.com/
```

Routes served by the React frontend:

- Home: `https://tkapi.onrender.com/`
- Keywords dashboard: `https://tkapi.onrender.com/keywords`
- Rankings: `https://tkapi.onrender.com/rankings`
- Platform rankings: `https://tkapi.onrender.com/rankings/platform/youtube`
- Keyword rankings: `https://tkapi.onrender.com/rankings/keyword/crypto`
- TikTok API settings: `https://tkapi.onrender.com/settings/tiktok`
- Terms: `https://tkapi.onrender.com/terms`
- Privacy: `https://tkapi.onrender.com/privacy`

Backend API routes stay under `/api`. FastAPI serves the built frontend for all non-API paths, so refreshing `/keywords`, `/settings/tiktok`, `/terms`, or `/privacy` will not 404.

Keyword search API:

```http
POST /api/search/keywords
```

Example:

```json
{
  "keyword": "crypto prediction market",
  "platforms": ["tiktok", "youtube"],
  "min_views": 1000,
  "min_likes": 100,
  "date_range": "7d",
  "limit": 50
}
```

TikTok keyword search uses only official API capabilities. If official permission is unavailable, the API returns a clear permission warning and does not collect restricted data.

Render build command:

```bash
pip install -r backend/requirements.txt && cd frontend && npm ci && npm run build
```

Render start command:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Render health check path:

```text
/health
```

Required Render environment variables:

```text
YOUTUBE_API_KEY=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_API_PROVIDER=official
TIKTOK_REDIRECT_URI=https://tkapi.onrender.com/api/tiktok/callback
TIKTOK_SCOPES=user.info.basic,video.list
FRONTEND_URL=https://tkapi.onrender.com
VITE_API_BASE_URL=https://tkapi.onrender.com
CORS_ORIGINS=https://tkapi.onrender.com,http://localhost:5173,http://127.0.0.1:5173
```

TikTok Developer Center Redirect URI:

```text
https://tkapi.onrender.com/api/tiktok/callback
```

It must be a fixed HTTPS URL with no query string and no `#` fragment.

## Docs And Migration Notes

- Project overview: `docs/PROJECT_OVERVIEW.md`
- API setup: `docs/API_SETUP.md`
- Render deployment: `docs/RENDER_DEPLOYMENT.md`
- Local Render-style testing: `docs/LOCAL_RENDER_TESTING.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Change history: `docs/CHANGELOG.md`
- Deployment notes: `deployment/`
- Next work items: `TODO.md`

Old code was copied into `archive/old_version/` for reference. Archived third-party TikTok code must not be imported by `backend/`, `frontend/`, or `scripts/`.

## Verification Commands

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-06-14\new-chat\outputs\social-video-tracker
rg -n -i "tikhub|TIKTOK_API_TOKEN|fetch_search_video|TIKTOK_API_BASE_URL|rapidapi|apify|scraper" backend frontend scripts deployment docs README.md render.yaml .env.example backend/.env.example
cd backend
.\.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm run build
cd ..
.\backend\.venv\Scripts\python.exe -m py_compile scripts\common.py scripts\youtube_collector.py scripts\x_collector.py scripts\tiktok_collector.py scripts\instagram_collector.py scripts\facebook_collector.py
```
