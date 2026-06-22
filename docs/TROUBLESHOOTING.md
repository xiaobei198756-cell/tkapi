# Troubleshooting

## YouTube returns API Key errors

Set `YOUTUBE_API_KEY`, restart the backend, and retry.

## X returns permission or credit errors

Confirm `X_BEARER_TOKEN`, developer plan access, and available X API credits. The local billing card is only an estimate.

## TikTok keyword search returns API not approved

This is expected until official TikTok Research API keyword/search permission is approved. The active project does not use third-party TikTok APIs.

## Frontend cannot reach backend

Check `VITE_API_BASE_URL`, `CORS_ORIGINS`, and `/api/health`.

## Render deploy succeeds but routes 404

Confirm the frontend build exists under `frontend/dist` and FastAPI is started with:

```bash
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
