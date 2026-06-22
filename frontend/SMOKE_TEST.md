# Frontend Smoke Test

Run these checks on Windows after Node.js LTS is installed.

## Static Build Check

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-06-14\new-chat\outputs\social-video-tracker\frontend
npm install
npm run typecheck
npm run build
```

Expected:

- `npm install` finishes without dependency errors.
- `npm run typecheck` exits with code 0.
- `npm run build` creates a `dist` folder.

## Browser Check

Start the backend first:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-06-14\new-chat\outputs\social-video-tracker\backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open these backend URLs:

- `http://127.0.0.1:8000/api/health`
- `http://127.0.0.1:8000/api/platform-status`
- `http://127.0.0.1:8000/docs`

Start the frontend in another PowerShell window:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-06-14\new-chat\outputs\social-video-tracker\frontend
npm install
npm run dev
```

Open `http://localhost:5173/`.

Expected:

- Platform status cards load from `GET /api/platform-status`.
- YouTube Search panel can call `GET /api/youtube/search?keyword=crypto&max_results=5`.
- Creating a job sends `POST /api/jobs` with `keywords`, `platforms`, `max_results`, `date_start`, `date_end`, and `refresh_interval_minutes`.
- Progress connects to `ws://127.0.0.1:8000/ws/jobs/{job_id}`.
- Video table loads `GET /api/videos`.
- Export CSV opens `GET /api/export/csv`.
- Page shows platform configuration status, keyword input, platform multi-select, start button, progress panel, video table, and CSV export button.

## YouTube Real API Check

1. Open `backend\.env`.
2. Set `YOUTUBE_API_KEY=your_YouTube_API_Key`.
3. Restart the backend.
4. Open `http://localhost:5173/`.
5. Select only YouTube.
6. Enter `crypto` or `ai news`.
7. Set `max_results` to `5`.
8. Click Start collection.
9. Expected: the table shows video title, author, published time, view count, like count, comment count, and video URL.
