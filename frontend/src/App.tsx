import { useEffect, useState } from "react";
import { api } from "./api/client";
import { BackendStatus } from "./components/BackendStatus";
import { JobForm } from "./components/JobForm";
import { JobProgress } from "./components/JobProgress";
import { KeywordSearchPage } from "./components/KeywordSearchPage";
import { PlatformStatus } from "./components/PlatformStatus";
import { TikTokSettings } from "./components/TikTokSettings";
import { VideoTable } from "./components/VideoTable";
import { XBillingCard } from "./components/XBillingCard";
import type { JobCreate } from "./types";

const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || "https://tkapi.onrender.com";

const navItems = [
  { path: "/features", label: "Features" },
  { path: "/keywords", label: "Keyword Search" },
  { path: "/dashboard", label: "Rankings" },
  { path: "/settings/tiktok", label: "TikTok API" },
  { path: "/terms", label: "Terms" },
  { path: "/privacy", label: "Privacy" },
  { path: "/disclaimer", label: "Disclaimer" },
];

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  return { path, navigate };
}

function FeatureCards({ navigate }: { navigate: (path: string) => void }) {
  const cards = [
    { title: "TikTok API Login", text: "Help authorized users connect TikTok accounts through official OAuth and API flows.", path: "/settings/tiktok" },
    { title: "Authorized Data Access", text: "Manage account-permitted creator and content data with clear API permission status.", path: "/keywords" },
    { title: "Compliant Workflows", text: "Support compliant creator, content, and reporting workflows for eligible users and businesses.", path: "/features" },
    { title: "Platform Status", text: "Review YouTube, X, TikTok, Instagram, and Facebook API availability in one place.", path: "/keywords" },
    { title: "Terms and Privacy", text: "Public legal pages are available without login for production review and user transparency.", path: "/terms" },
  ];

  return (
    <section className="feature-grid">
      {cards.map((card) => (
        <button className="feature-card" key={card.title} onClick={() => navigate(card.path)} type="button">
          <strong>{card.title}</strong>
          <span>{card.text}</span>
        </button>
      ))}
    </section>
  );
}

function HomePage({ navigate }: { navigate: (path: string) => void }) {
  return (
    <>
      <section className="hero">
        <div>
          <h1>TKAPI Video Data Analytics Tool</h1>
          <p>
            TKAPI helps authorized users connect with TikTok APIs to manage account login, authorized data access,
            and compliant creator/content workflows.
          </p>
          <p>
            This service is available for users and businesses in regions where TikTok services are available. It is
            not intended for Mainland China.
          </p>
          <p>
            Contact: <a href="mailto:xiaobei198756@gmail.com">xiaobei198756@gmail.com</a>
          </p>
          <div className="hero-actions">
            <button className="primary-button large-button" onClick={() => navigate("/keywords")} type="button">
              Start Keyword Analysis
            </button>
            <button className="secondary-button" onClick={() => navigate("/settings/tiktok")} type="button">
              Connect TikTok API
            </button>
            <button className="secondary-button" onClick={() => navigate("/features")} type="button">
              View Features
            </button>
          </div>
        </div>
      </section>
      <FeatureCards navigate={navigate} />
    </>
  );
}

function DashboardPage() {
  const [activeJobId, setActiveJobId] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

  async function createJob(payload: JobCreate) {
    setError("");
    try {
      const job = await api.createJob(payload);
      setActiveJobId(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create job");
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Keyword Collection</h2>
        <p>Run official API collection jobs, monitor progress, and inspect saved video records.</p>
      </div>
      <PlatformStatus />
      <XBillingCard />
      {error && <div className="error-banner">{error}</div>}
      <section className="dashboard-grid">
        <JobForm onSubmit={createJob} />
        <JobProgress jobId={activeJobId} onFinished={() => setRefreshKey((value) => value + 1)} />
      </section>
      <VideoTable refreshKey={refreshKey} />
    </section>
  );
}

function RankingsPage({ platform, keyword }: { platform?: string; keyword?: string }) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>{platform ? `${platform.toUpperCase()} Ranking` : keyword ? `Keyword Ranking: ${keyword}` : "Video Rankings"}</h2>
        <p>Browse saved video records by platform, keyword, and engagement metrics.</p>
      </div>
      <VideoTable initialPlatform={platform} initialKeyword={keyword} />
    </section>
  );
}

type LegalKind = "terms" | "privacy" | "disclaimer";

const legalPages: Record<LegalKind, { title: string; updated: string; blocks: Array<string | string[]> }> = {
  privacy: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 2026",
    blocks: [
      "نحن نحترم خصوصيتك ونلتزم بحماية المعلومات الشخصية التي قد تقدمها عند استخدام هذا الموقع.",
      "المعلومات التي قد نقوم بجمعها:",
      [
        "الاسم ومعلومات الاتصال مثل رقم الهاتف أو البريد الإلكتروني أو حساب WhatsApp أو Telegram.",
        "معلومات الطلب أو الاستفسار التي يرسلها المستخدم من خلال الموقع.",
        "بيانات تقنية عامة مثل عنوان IP، نوع المتصفح، نوع الجهاز، وقت الزيارة، والصفحات التي تم تصفحها.",
        "قد نستخدم ملفات تعريف الارتباط وأدوات تحليل الإعلانات مثل TikTok Pixel أو Meta Pixel أو Google Analytics لتحسين تجربة المستخدم وقياس أداء الحملات الإعلانية.",
      ],
      "كيفية استخدام المعلومات:",
      [
        "الرد على استفسارات المستخدمين.",
        "تقديم معلومات حول المنتجات والخدمات.",
        "معالجة الطلبات والتواصل بخصوص خدمة العملاء.",
        "تحسين الموقع وتجربة المستخدم.",
        "تحليل أداء الحملات الإعلانية.",
      ],
      "نحن لا نبيع المعلومات الشخصية للمستخدمين إلى أطراف ثالثة.",
      "قد نشارك بعض البيانات مع مزودي خدمات موثوقين مثل خدمات الدفع، أدوات التحليل، منصات الإعلانات، أو أدوات التواصل مثل WhatsApp و Telegram، وذلك فقط عند الحاجة لتقديم الخدمة أو تحسينها.",
      "يحق للمستخدم طلب حذف أو تعديل بياناته الشخصية أو التوقف عن استخدامها من خلال التواصل معنا عبر البريد الإلكتروني:",
      "xiaobei198756@gmail.com",
      "نستخدم إجراءات معقولة لحماية البيانات، ولكن لا يمكن ضمان الأمان الكامل لأي نقل بيانات عبر الإنترنت.",
      "هذا الموقع غير موجه للأطفال أو القاصرين.",
      "قد نقوم بتحديث سياسة الخصوصية من وقت لآخر، وسيتم نشر أي تغييرات على هذه الصفحة.",
    ],
  },
  terms: {
    title: "شروط الاستخدام",
    updated: "آخر تحديث: 2026",
    blocks: [
      "باستخدامك لهذا الموقع، فإنك توافق على الالتزام بشروط الاستخدام التالية.",
      "يجب استخدام هذا الموقع بطريقة قانونية ومسؤولة فقط.",
      "المعلومات الموجودة على هذا الموقع مقدمة لأغراض عامة تتعلق بالعناية الطبيعية ونمط الحياة الصحي، ولا تعتبر نصيحة طبية أو علاجية.",
      "لا يجوز إساءة استخدام الموقع، أو إرسال معلومات مزيفة، أو محاولة اختراق الخادم، أو استخدام الموقع بطريقة تخالف القوانين أو سياسات المنصات الإعلانية.",
      "نحتفظ بالحق في تعديل محتوى الموقع أو المنتجات أو الأسعار أو السياسات في أي وقت دون إشعار مسبق.",
      "يجب على المستخدم قراءة المعلومات بعناية واتخاذ قراره الشخصي قبل طلب أي منتج أو التواصل معنا.",
      "لأي استفسار، يمكن التواصل معنا عبر:",
      "xiaobei198756@gmail.com",
    ],
  },
  disclaimer: {
    title: "إخلاء مسؤولية صحية",
    updated: "آخر تحديث: 2026",
    blocks: [
      "المحتوى الموجود على هذا الموقع لا يشكل نصيحة طبية ولا يهدف إلى تشخيص أو علاج أو شفاء أو منع أي مرض.",
      "المنتجات أو المعلومات المذكورة في هذا الموقع مخصصة للدعم العام للعناية الطبيعية ونمط الحياة الصحي فقط.",
      "النتائج قد تختلف من شخص لآخر، ولا يمكن ضمان نتائج محددة.",
      "إذا كنت تعاني من أي حالة صحية، أو تستخدم أدوية، أو لديك حساسية، أو كنتِ حاملاً أو مرضعة، فيجب استشارة مختص صحي قبل استخدام أي منتج.",
      "لا يجب الاعتماد على محتوى هذا الموقع كبديل عن استشارة الطبيب أو المختص.",
      "لأي استفسار، يمكن التواصل معنا عبر:",
      "xiaobei198756@gmail.com",
    ],
  },
};

function ComplianceFooter({ navigate }: { navigate: (path: string) => void }) {
  return (
    <footer className="compliance-footer" lang="ar" dir="rtl">
      <span>TKAPI</span>
      <button onClick={() => navigate("/privacy")} type="button">سياسة الخصوصية</button>
      <button onClick={() => navigate("/terms")} type="button">شروط الاستخدام</button>
      <button onClick={() => navigate("/disclaimer")} type="button">إخلاء مسؤولية صحية</button>
    </footer>
  );
}

function LegalPage({ kind }: { kind: LegalKind }) {
  const page = legalPages[kind];

  return (
    <section className="legal-page dashboard-card arabic-legal-page" lang="ar" dir="rtl">
      <p className="legal-site-url">{SITE_URL}</p>
      <h1>{page.title}</h1>
      {page.blocks.map((block, index) =>
        Array.isArray(block) ? (
          <ul key={index}>
            {block.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : block === "xiaobei198756@gmail.com" ? (
          <p key={index}>
            <a href="mailto:xiaobei198756@gmail.com">xiaobei198756@gmail.com</a>
          </p>
        ) : (
          <p key={index}>{block}</p>
        ),
      )}
      <p className="legal-updated">{page.updated}</p>
    </section>
  );
}
export default function App() {
  const { path, navigate } = useRoute();
  const currentPath = path.startsWith("/rankings") ? "/dashboard" : path;
  const platformMatch = path.match(/^\/rankings\/platform\/([^/]+)$/);
  const keywordMatch = path.match(/^\/rankings\/keyword\/(.+)$/);
  const rankingPlatform = platformMatch?.[1];
  const rankingKeyword = keywordMatch?.[1] ? decodeURIComponent(keywordMatch[1]) : undefined;

  return (
    <main>
      <header className="site-nav">
        <button className="brand-button" onClick={() => navigate("/")} type="button">
          TKAPI
        </button>
        <nav>
          {navItems.map((item) => (
            <button
              className="nav-link"
              data-active={currentPath === item.path}
              key={item.path}
              onClick={() => navigate(item.path)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <BackendStatus />
      </header>

      {path === "/" && <HomePage navigate={navigate} />}
      {path === "/features" && <FeatureCards navigate={navigate} />}
      {path === "/keywords" && <KeywordSearchPage />}
      {path === "/dashboard" && <DashboardPage />}
      {path === "/rankings" && <RankingsPage />}
      {rankingPlatform && <RankingsPage platform={rankingPlatform} />}
      {rankingKeyword && <RankingsPage keyword={rankingKeyword} />}
      {path === "/settings/tiktok" && <TikTokSettings />}
      {path === "/terms" && <LegalPage kind="terms" />}
      {path === "/privacy" && <LegalPage kind="privacy" />}
      {path === "/disclaimer" && <LegalPage kind="disclaimer" />}
      <ComplianceFooter navigate={navigate} />
    </main>
  );
}


