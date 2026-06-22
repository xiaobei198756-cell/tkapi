# Backend

FastAPI backend for the Social Video Tracker. Stage 1 includes a working YouTube Data API v3 adapter and independent scaffold adapters for TikTok, X, Instagram, and Facebook.

## Run

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Set `YOUTUBE_API_KEY` in `.env` before collecting YouTube data.

For later runs after the virtual environment is created:

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API

- `POST /api/jobs` creates a collection job and starts it in the background.
- `GET /api/jobs` lists jobs.
- `GET /api/jobs/{job_id}` returns one job.
- `GET /api/health` returns service health.
- `GET /api/platform-status` returns API key configuration status for each platform.
- `GET /api/videos` lists collected videos with filters and sorting.
- `GET /api/videos/{id}` returns one video record.
- `GET /api/export/csv` exports filtered records.
- `WS /ws/jobs/{job_id}` streams job progress events.

Example job payload:

```json
{
  "keywords": ["openai", "ai video"],
  "platforms": ["youtube", "x"],
  "max_results": 10,
  "date_start": "2026-01-01",
  "date_end": "2026-06-20",
  "refresh_interval_minutes": 30
}
```

X platform search implementations should use `has:videos`, for example `openai has:videos`.

## YouTube Real API Test

The backend reads `YOUTUBE_API_KEY` from environment variables, project-root `.env`, or `backend/.env`.

1. Open `backend/.env` or project-root `.env`.
2. Set `YOUTUBE_API_KEY=your_YouTube_API_Key`.
3. Restart the backend.
4. Open the frontend at `http://localhost:5173/`.
5. Enter keywords such as `crypto`, `ai news`, and `football highlights`.
6. Select only YouTube.
7. Set `max_results` to `5`.
8. Start collection.
9. Confirm the frontend table shows title, author, published time, view count, like count, comment count, and video link.

Direct endpoint:

```text
GET /api/youtube/search?keyword=crypto&max_results=5
```

Public API responses return platform, keyword, video URL, title, author, published time, likes, comments, favorites, shares, and collected time.

## Platform Field Notes

All platform collector results exposed by API responses normalize into the same public fields: `platform`, `keyword`, `video_url`, `title`, `author`, `published_at`, `likes`, `comments`, `favorites`, `shares`, and `collected_at`.

- YouTube: implemented via YouTube Data API v3; unavailable `favorites` and `shares` values are `null`.
- X: requires `X_BEARER_TOKEN` and official search/media permissions; future default query is `keyword has:videos`.
- TikTok: requires approved official TikTok API credentials.
- Instagram: requires `META_ACCESS_TOKEN` and `IG_USER_ID`.
- Facebook: requires `META_ACCESS_TOKEN` and `FB_PAGE_IDS`.

## Compliance Notes

Adapters are designed around official APIs and permissioned access. The project does not include unsupported access methods, credential misuse, proxy-based evasion, or automated simulated user login. Unsupported or permission-limited fields are stored as `null`, and adapter status is surfaced through progress events and `source_status`.

## TikTok Official API

Configure:

```text
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_ACCESS_TOKEN=
TIKTOK_API_PROVIDER=official
TIKTOK_REDIRECT_URI=https://your-domain.com/api/tiktok/callback
TIKTOK_SCOPES=user.info.basic,video.list
FRONTEND_URL=http://localhost:5173
```

Redirect URI in TikTok Developer Center must match `TIKTOK_REDIRECT_URI` exactly.
TikTok keyword search requires official TikTok Research API / keyword search permission approval.

Endpoints:

- `GET /api/tiktok/auth-url`
- `GET /api/tiktok/callback`
- `GET /api/tiktok/status`
- `POST /api/tiktok/token/refresh`
- `GET /api/tiktok/user/videos`
- `POST /api/tiktok/videos/query`

Token storage is local backend JSON: `backend/.tiktok_token.json`. This file is ignored by Git and tokens are not returned to the frontend.

## X API Billing Estimate

Optional `.env` values:

```text
X_CREDIT_BALANCE_USD=0
X_POST_READ_UNIT_COST=0.005
X_USER_READ_UNIT_COST=0.010
X_MAX_RESULTS_LIMIT=50
```

Endpoints:

- `GET /api/x/billing/status`
- `GET /api/x/billing/usage`
- `POST /api/x/billing/balance`
- `GET /api/x/usage/official`

The balance is a local estimate based on recorded X usage plus the manually entered X Developer Console balance. X tokens stay server-side only.
