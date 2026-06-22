# Render Deployment

Use the root `render.yaml` for the existing Render service.

Root Directory:

```text
Leave blank if the connected Git repository root is this project directory.
Use social-video-tracker only if the Git repository contains this project inside a social-video-tracker subfolder.
```

Build Command:

```bash
pip install -r backend/requirements.txt && cd frontend && npm ci && npm run build
```

Start Command:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Health Check Path:

```text
/health
```

Required values:

```text
FRONTEND_URL=https://tkapi.onrender.com
VITE_API_BASE_URL=https://tkapi.onrender.com
CORS_ORIGINS=https://tkapi.onrender.com,http://localhost:5173,http://127.0.0.1:5173
TIKTOK_REDIRECT_URI=https://tkapi.onrender.com/api/tiktok/callback
```

Secrets must be configured in Render Environment with `sync: false`:

```text
YOUTUBE_API_KEY
X_BEARER_TOKEN
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
META_ACCESS_TOKEN
```

SQLite is acceptable for smoke testing but not durable on Render free services. Use persistent storage or PostgreSQL before relying on production data.
