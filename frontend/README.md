# Frontend

React + Vite + TypeScript dashboard for creating collection jobs, watching progress, filtering collected records, sorting metrics, and exporting CSV.

## Windows Run

Start the backend first:

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://127.0.0.1:8000`. To use another URL, create `.env.local`:

```powershell
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Open `http://localhost:5173/` after `npm run dev` starts.

Backend docs: `http://127.0.0.1:8000/docs`

## API Integration Checklist

- Job form submits `POST /api/jobs`.
- Platform status loads `GET /api/platform-status`.
- Collection Setup submits YouTube jobs through `POST /api/jobs`.
- Video table loads `GET /api/videos`.
- CSV export opens `GET /api/export/csv`.
- Progress uses `ws://127.0.0.1:8000/ws/jobs/{job_id}` by default.

The job payload uses backend snake_case fields: `keywords`, `platforms`, `max_results`, `date_start`, `date_end`, and `refresh_interval_minutes`.

## Smoke Test

See [SMOKE_TEST.md](SMOKE_TEST.md).

## Deployed Routes

- Home: `/`
- Keywords dashboard: `/keywords`
- TikTok API settings: `/settings/tiktok`
- Terms: `/terms`
- Privacy: `/privacy`

For Render, set:

```text
VITE_API_BASE_URL=https://tkapi.onrender.com
```
