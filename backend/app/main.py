import os
from html import escape
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
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

PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://tkapi.onrender.com")
CONTACT_EMAIL = "xiaobei198756@gmail.com"

LEGAL_PAGES: dict[str, dict[str, list[str]]] = {
    "privacy": {
        "title": "Privacy Policy",
        "paragraphs": [
            "TKAPI respects your privacy and is committed to protecting information that users may provide while using this website.",
            "Information we may collect:",
            "- Contact information such as name, email address, or support messages submitted by users.",
            "- Account authorization status and API permission information needed to support official TikTok API workflows.",
            "- General technical data such as IP address, browser type, device type, visit time, and pages viewed.",
            "- Cookies and analytics signals may be used to improve the service, measure performance, and support compliant product operations.",
            "How we use information:",
            "- Respond to user inquiries and support requests.",
            "- Provide information about TKAPI features and authorized API workflows.",
            "- Maintain, secure, and improve the website and user experience.",
            "- Analyze service performance and product usage in a privacy-conscious manner.",
            "We do not sell users' personal information to third parties.",
            "We may share limited data with trusted service providers when necessary to operate hosting, analytics, security, support, or communication tools.",
            f"Users may request deletion or correction of personal information by contacting us at: {CONTACT_EMAIL}",
            "No internet transmission can be guaranteed to be fully secure, but we use reasonable safeguards to protect data.",
            "This website is not directed to children or minors.",
            "We may update this Privacy Policy from time to time. Updates will be posted on this page.",
            "Last updated: 2026",
        ],
    },
    "terms": {
        "title": "Terms of Use",
        "paragraphs": [
            "By using this website, you agree to these Terms of Use.",
            "This website must be used only in a lawful, responsible, and compliant manner.",
            "TKAPI helps authorized users connect with TikTok APIs to manage account login, authorized data access, and compliant creator/content workflows.",
            "You may not misuse the website, submit false information, attempt to compromise the service, or use the service in a way that violates applicable laws or platform policies.",
            "We may update website content, features, policies, or availability at any time.",
            "Users are responsible for ensuring they have the necessary permissions and approvals before connecting accounts or using API-related features.",
            f"For questions, contact: {CONTACT_EMAIL}",
            "Last updated: 2026",
        ],
    },
    "disclaimer": {
        "title": "Disclaimer",
        "paragraphs": [
            "The information on this website is provided for general product and compliance information only.",
            "TKAPI is intended to support authorized API workflows. It does not authorize users to access data they are not permitted to access.",
            "Availability of features may depend on TikTok Developer permissions, API scopes, regional availability, and platform review status.",
            "This service is available for users and businesses in regions where TikTok services are available and is not intended for Mainland China.",
            "Users should review applicable platform policies and legal requirements before using connected API features.",
            f"For questions, contact: {CONTACT_EMAIL}",
            "Last updated: 2026",
        ],
    },
}


def render_legal_page(kind: str) -> HTMLResponse:
    page = LEGAL_PAGES[kind]
    title = page["title"]
    paragraphs = "\n".join(f"<p>{escape(text)}</p>" for text in page["paragraphs"])
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)} | TKAPI</title>
  <style>
    :root {{
      color: #12201a;
      background: #eef4ef;
      font-family: Arial, "Segoe UI", Tahoma, sans-serif;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: #eef4ef; }}
    header, main, footer {{ width: min(960px, calc(100% - 32px)); margin: 0 auto; }}
    header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 24px 0 16px;
    }}
    .brand {{
      color: #0f2d22;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0;
      text-decoration: none;
    }}
    nav, footer {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }}
    a {{ color: #19734f; font-weight: 700; text-decoration: none; }}
    main {{
      background: #ffffff;
      border: 1px solid #d7e4dc;
      border-radius: 12px;
      box-shadow: 0 14px 32px rgba(18, 32, 26, 0.08);
      margin-top: 16px;
      padding: 36px;
    }}
    h1 {{ margin: 0 0 24px; font-size: clamp(30px, 6vw, 48px); line-height: 1.15; }}
    p {{ color: #3b5249; font-size: 18px; line-height: 1.8; margin: 0 0 16px; }}
    .site-url {{ color: #65786f; font-size: 15px; margin-bottom: 28px; }}
    footer {{ padding: 24px 0 40px; justify-content: center; }}
    @media (max-width: 640px) {{
      header {{ align-items: flex-start; flex-direction: column; }}
      main {{ padding: 24px 18px; }}
      p {{ font-size: 16px; }}
    }}
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/">TKAPI</a>
    <nav aria-label="Compliance links">
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Use</a>
      <a href="/disclaimer">Disclaimer</a>
    </nav>
  </header>
  <main>
    <h1>{escape(title)}</h1>
    <p class="site-url">{escape(PUBLIC_SITE_URL)}</p>
    {paragraphs}
  </main>
  <footer>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Use</a>
    <a href="/disclaimer">Disclaimer</a>
  </footer>
</body>
</html>"""
    return HTMLResponse(content=html)


@app.get("/privacy", include_in_schema=False)
def privacy_page() -> HTMLResponse:
    return render_legal_page("privacy")


@app.get("/terms", include_in_schema=False)
def terms_page() -> HTMLResponse:
    return render_legal_page("terms")


@app.get("/disclaimer", include_in_schema=False)
def disclaimer_page() -> HTMLResponse:
    return render_legal_page("disclaimer")
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

