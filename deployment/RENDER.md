# Render Deployment

Production domain: https://tkapi.onrender.com

Root Directory:

```text
Leave blank if the connected Git repository root is this project directory.
Set to social-video-tracker only if this project lives inside a larger repository under a social-video-tracker folder.
```

Build command:

```bash
pip install -r backend/requirements.txt && cd frontend && npm ci && npm run build
```

Start command:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Health check path:

```text
/health
```

The deployed service is a single Python web service. FastAPI serves backend routes under `/api` and serves the built React app for non-API routes.

Keep `render.yaml` at the project root so the existing Render deployment continues to work.
