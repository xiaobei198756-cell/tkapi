# Environment Variables

Copy `.env.example` or `backend/.env.example` and fill values locally. Do not commit real secrets.

Required for YouTube:

```text
YOUTUBE_API_KEY=
```

Required for X:

```text
X_BEARER_TOKEN=
X_CREDIT_BALANCE_USD=0
X_POST_READ_UNIT_COST=0.005
X_USER_READ_UNIT_COST=0.010
X_MAX_RESULTS_LIMIT=50
```

Required for TikTok official OAuth / Display API:

```text
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_API_PROVIDER=official
TIKTOK_REDIRECT_URI=https://tkapi.onrender.com/api/tiktok/callback
TIKTOK_SCOPES=user.info.basic,video.list
```

Meta placeholders:

```text
META_ACCESS_TOKEN=
IG_USER_ID=
FB_PAGE_IDS=
```

TikTok third-party API variables such as `TIKTOK_API_TOKEN` or `TIKTOK_API_BASE_URL` are intentionally not part of the active project.
