# Windows Local Runbook

This guide is for running Social Video Tracker on a Windows development machine.

## 1. Install Python 3.11+

Install Python from the official website:

https://www.python.org/downloads/windows/

During installation, enable:

- Add python.exe to PATH
- Install launcher for all users

## 2. Disable Windows Store Python Alias

If `python` opens the Microsoft Store or points to `WindowsApps\python.exe`, disable the Store alias:

1. Open Windows Settings.
2. Go to Apps.
3. Open Advanced app settings.
4. Open App execution aliases.
5. Turn off `python.exe`.
6. Turn off `python3.exe`.

## 3. Install Node.js LTS

Install Node.js LTS from:

https://nodejs.org/

The installer includes `node` and `npm`.

## 4. Verify Environment

Open a new PowerShell window and run:

```powershell
py -3 --version
python --version
node -v
npm -v
```

Expected:

- `py -3 --version` shows Python 3.11 or newer.
- `python --version` shows Python 3.11 or newer.
- `node -v` shows an LTS Node version.
- `npm -v` prints an npm version.

## 5. Start Backend

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-06-14\new-chat\outputs\social-video-tracker\backend
py -3 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Set `YOUTUBE_API_KEY` in `backend\.env` to collect real YouTube data. Without it, the app still runs and returns a clear `youtube_api_key_missing` status record.

## 6. Start Frontend

Open another PowerShell window:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-06-14\new-chat\outputs\social-video-tracker\frontend
npm install
npm run dev
```

## 7. Open Browser

- Backend docs: http://127.0.0.1:8000/docs
- Frontend page: http://localhost:5173/

## 8. Run Smoke Tests

With the backend virtual environment activated:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-06-14\new-chat\outputs\social-video-tracker\backend
pytest
```

Expected:

- FastAPI app imports.
- `/api/health` returns 200.
- `/api/platform-status` returns 200.
- SQLite tables can be created.
- YouTube adapter returns `youtube_api_key_missing` when no API key is configured.

## 9. Common Fixes

- `python` opens Microsoft Store: disable App execution aliases for `python.exe` and `python3.exe`, then reopen PowerShell.
- `npm` is not recognized: install Node.js LTS, then reopen PowerShell.
- `uvicorn` is not recognized: activate `.venv` and rerun `pip install -r requirements.txt`.
- Frontend cannot connect to backend: confirm backend is running on `http://127.0.0.1:8000` and CORS includes `http://localhost:5173`.
- YouTube returns only status rows: set `YOUTUBE_API_KEY` in `backend\.env`, restart backend, and create a new job.
