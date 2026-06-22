from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import PROJECT_DIR, get_settings
from app.database import init_db
from app.routers import export, jobs, search, system, tiktok, videos, x_billing, youtube

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env", override=True)

settings = get_settings()

app = FastAPI(title="Social Video Tracker", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "social-video-tracker"}


app.include_router(system.router)
app.include_router(jobs.router)
app.include_router(jobs.ws_router)
app.include_router(videos.router)
app.include_router(export.router)
app.include_router(youtube.router)
app.include_router(x_billing.router)
app.include_router(tiktok.router)
app.include_router(search.router)

FRONTEND_DIST = PROJECT_DIR / "frontend" / "dist"
FRONTEND_ASSETS = FRONTEND_DIST / "assets"

if FRONTEND_ASSETS.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    index_html = FRONTEND_DIST / "index.html"
    if index_html.exists():
        return FileResponse(index_html)
    return {"status": "frontend_not_built", "message": "Run npm install && npm run build in frontend/."}
