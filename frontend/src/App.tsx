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

const navItems = [
  { path: "/features", label: "Features" },
  { path: "/keywords", label: "Keyword Search" },
  { path: "/dashboard", label: "Rankings" },
  { path: "/settings/tiktok", label: "TikTok API" },
  { path: "/terms", label: "Terms" },
  { path: "/privacy", label: "Privacy" },
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

function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  if (kind === "terms") {
    return (
      <section className="legal-page dashboard-card">
        <h1>Terms of Service</h1>
        <p>Last updated: June 22, 2026</p>
        <p>
          TKAPI provides tools that help authorized users and businesses connect with TikTok APIs to manage account
          login, authorized data access, and compliant creator/content workflows.
        </p>
        <p>
          TKAPI is available for users and businesses in regions where TikTok services are available and is not
          intended for Mainland China.
        </p>
        <p>
          Users are responsible for complying with TikTok Developer Terms, TikTok API permissions, applicable platform
          policies, and all laws that apply to their use of the service.
        </p>
        <p>
          TKAPI uses official API and OAuth flows. Users may only access data they are authorized to access through
          granted platform permissions.
        </p>
        <p>
          For support or compliance questions, contact <a href="mailto:xiaobei198756@gmail.com">xiaobei198756@gmail.com</a>.
        </p>
      </section>
    );
  }

  return (
    <section className="legal-page dashboard-card">
      <h1>Privacy Policy</h1>
      <p>Last updated: June 22, 2026</p>
      <p>
        TKAPI uses official platform APIs and permissioned OAuth flows to support account login, authorized data
        access, and compliant creator/content workflows.
      </p>
      <p>
        We do not display client secrets, access tokens, or refresh tokens in the frontend. Sensitive credentials are
        stored only in backend environments controlled by the service operator.
      </p>
      <p>
        Public pages, including the homepage, Terms of Service, and Privacy Policy, are available without login for
        users, businesses, and platform review teams.
      </p>
      <p>
        If you request deletion of connected account data or have privacy questions, contact{" "}
        <a href="mailto:xiaobei198756@gmail.com">xiaobei198756@gmail.com</a>.
      </p>
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
    </main>
  );
}
