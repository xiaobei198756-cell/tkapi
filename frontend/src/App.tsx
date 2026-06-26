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
    title: "Privacy Policy",
    updated: "Last updated: 2026",
    blocks: [
      "TKAPI respects your privacy and is committed to protecting information that users may provide while using this website.",
      "Information we may collect:",
      [
        "Contact information such as name, email address, or support messages submitted by users.",
        "Account authorization status and API permission information needed to support official TikTok API workflows.",
        "General technical data such as IP address, browser type, device type, visit time, and pages viewed.",
        "Cookies and analytics signals may be used to improve the service, measure performance, and support compliant product operations.",
      ],
      "How we use information:",
      [
        "Respond to user inquiries and support requests.",
        "Provide information about TKAPI features and authorized API workflows.",
        "Maintain, secure, and improve the website and user experience.",
        "Analyze service performance and product usage in a privacy-conscious manner.",
      ],
      "We do not sell users' personal information to third parties.",
      "We may share limited data with trusted service providers when necessary to operate hosting, analytics, security, support, or communication tools.",
      "Users may request deletion or correction of personal information by contacting us at:",
      "xiaobei198756@gmail.com",
      "No internet transmission can be guaranteed to be fully secure, but we use reasonable safeguards to protect data.",
      "This website is not directed to children or minors.",
      "We may update this Privacy Policy from time to time. Updates will be posted on this page.",
    ],
  },
  terms: {
    title: "Terms of Use",
    updated: "Last updated: 2026",
    blocks: [
      "By using this website, you agree to these Terms of Use.",
      "This website must be used only in a lawful, responsible, and compliant manner.",
      "TKAPI helps authorized users connect with TikTok APIs to manage account login, authorized data access, and compliant creator/content workflows.",
      "You may not misuse the website, submit false information, attempt to compromise the service, or use the service in a way that violates applicable laws or platform policies.",
      "We may update website content, features, policies, or availability at any time.",
      "Users are responsible for ensuring they have the necessary permissions and approvals before connecting accounts or using API-related features.",
      "For questions, contact:",
      "xiaobei198756@gmail.com",
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    updated: "Last updated: 2026",
    blocks: [
      "The information on this website is provided for general product and compliance information only.",
      "TKAPI is intended to support authorized API workflows. It does not authorize users to access data they are not permitted to access.",
      "Availability of features may depend on TikTok Developer permissions, API scopes, regional availability, and platform review status.",
      "This service is available for users and businesses in regions where TikTok services are available and is not intended for Mainland China.",
      "Users should review applicable platform policies and legal requirements before using connected API features.",
      "For questions, contact:",
      "xiaobei198756@gmail.com",
    ],
  },
};

function ComplianceFooter({ navigate }: { navigate: (path: string) => void }) {
  return (
    <footer className="compliance-footer">
      <span>TKAPI</span>
      <button onClick={() => navigate("/privacy")} type="button">Privacy Policy</button>
      <button onClick={() => navigate("/terms")} type="button">Terms of Use</button>
      <button onClick={() => navigate("/disclaimer")} type="button">Disclaimer</button>
    </footer>
  );
}

function LegalPage({ kind }: { kind: LegalKind }) {
  const page = legalPages[kind];

  return (
    <section className="legal-page dashboard-card">
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



