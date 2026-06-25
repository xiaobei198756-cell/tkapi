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
        "title": "سياسة الخصوصية",
        "paragraphs": [
            "نحن نحترم خصوصيتك ونلتزم بحماية المعلومات الشخصية التي قد تقدمها عند استخدام هذا الموقع.",
            "المعلومات التي قد نقوم بجمعها:",
            "- الاسم ومعلومات الاتصال مثل رقم الهاتف أو البريد الإلكتروني أو حساب WhatsApp أو Telegram.",
            "- معلومات الطلب أو الاستفسار التي يرسلها المستخدم من خلال الموقع.",
            "- بيانات تقنية عامة مثل عنوان IP، نوع المتصفح، نوع الجهاز، وقت الزيارة، والصفحات التي تم تصفحها.",
            "- قد نستخدم ملفات تعريف الارتباط وأدوات تحليل الإعلانات مثل TikTok Pixel أو Meta Pixel أو Google Analytics لتحسين تجربة المستخدم وقياس أداء الحملات الإعلانية.",
            "كيفية استخدام المعلومات:",
            "- الرد على استفسارات المستخدمين.",
            "- تقديم معلومات حول المنتجات والخدمات.",
            "- معالجة الطلبات والتواصل بخصوص خدمة العملاء.",
            "- تحسين الموقع وتجربة المستخدم.",
            "- تحليل أداء الحملات الإعلانية.",
            "نحن لا نبيع المعلومات الشخصية للمستخدمين إلى أطراف ثالثة.",
            "قد نشارك بعض البيانات مع مزودي خدمات موثوقين مثل خدمات الدفع، أدوات التحليل، منصات الإعلانات، أو أدوات التواصل مثل WhatsApp و Telegram، وذلك فقط عند الحاجة لتقديم الخدمة أو تحسينها.",
            f"يحق للمستخدم طلب حذف أو تعديل بياناته الشخصية أو التوقف عن استخدامها من خلال التواصل معنا عبر البريد الإلكتروني: {CONTACT_EMAIL}",
            "نستخدم إجراءات معقولة لحماية البيانات، ولكن لا يمكن ضمان الأمان الكامل لأي نقل بيانات عبر الإنترنت.",
            "هذا الموقع غير موجه للأطفال أو القاصرين.",
            "قد نقوم بتحديث سياسة الخصوصية من وقت لآخر، وسيتم نشر أي تغييرات على هذه الصفحة.",
            "آخر تحديث: 2026",
        ],
    },
    "terms": {
        "title": "شروط الاستخدام",
        "paragraphs": [
            "باستخدامك لهذا الموقع، فإنك توافق على الالتزام بشروط الاستخدام التالية.",
            "يجب استخدام هذا الموقع بطريقة قانونية ومسؤولة فقط.",
            "المعلومات الموجودة على هذا الموقع مقدمة لأغراض عامة تتعلق بالعناية الطبيعية ونمط الحياة الصحي، ولا تعتبر نصيحة طبية أو علاجية.",
            "لا يجوز إساءة استخدام الموقع، أو إرسال معلومات مزيفة، أو محاولة اختراق الخادم، أو استخدام الموقع بطريقة تخالف القوانين أو سياسات المنصات الإعلانية.",
            "نحتفظ بالحق في تعديل محتوى الموقع أو المنتجات أو الأسعار أو السياسات في أي وقت دون إشعار مسبق.",
            "يجب على المستخدم قراءة المعلومات بعناية واتخاذ قراره الشخصي قبل طلب أي منتج أو التواصل معنا.",
            f"لأي استفسار، يمكن التواصل معنا عبر: {CONTACT_EMAIL}",
            "آخر تحديث: 2026",
        ],
    },
    "disclaimer": {
        "title": "إخلاء مسؤولية صحية",
        "paragraphs": [
            "المحتوى الموجود على هذا الموقع لا يشكل نصيحة طبية ولا يهدف إلى تشخيص أو علاج أو شفاء أو منع أي مرض.",
            "المنتجات أو المعلومات المذكورة في هذا الموقع مخصصة للدعم العام للعناية الطبيعية ونمط الحياة الصحي فقط.",
            "النتائج قد تختلف من شخص لآخر، ولا يمكن ضمان نتائج محددة.",
            "إذا كنت تعاني من أي حالة صحية، أو تستخدم أدوية، أو لديك حساسية، أو كنتِ حاملاً أو مرضعة، فيجب استشارة مختص صحي قبل استخدام أي منتج.",
            "لا يجب الاعتماد على محتوى هذا الموقع كبديل عن استشارة الطبيب أو المختص.",
            f"لأي استفسار، يمكن التواصل معنا عبر: {CONTACT_EMAIL}",
            "آخر تحديث: 2026",
        ],
    },
}


def render_legal_page(kind: str) -> HTMLResponse:
    page = LEGAL_PAGES[kind]
    title = page["title"]
    paragraphs = "\n".join(f"<p>{escape(text)}</p>" for text in page["paragraphs"])
    html = f"""<!doctype html>
<html lang="ar" dir="rtl">
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
    p {{ color: #3b5249; font-size: 18px; line-height: 1.9; margin: 0 0 16px; }}
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
    <nav aria-label="روابط الامتثال">
      <a href="/privacy">سياسة الخصوصية</a>
      <a href="/terms">شروط الاستخدام</a>
      <a href="/disclaimer">إخلاء مسؤولية صحية</a>
    </nav>
  </header>
  <main>
    <h1>{escape(title)}</h1>
    <p class="site-url">{escape(PUBLIC_SITE_URL)}</p>
    {paragraphs}
  </main>
  <footer>
    <a href="/privacy">سياسة الخصوصية</a>
    <a href="/terms">شروط الاستخدام</a>
    <a href="/disclaimer">إخلاء مسؤولية صحية</a>
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
