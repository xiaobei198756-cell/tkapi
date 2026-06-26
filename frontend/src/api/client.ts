import type {
  JobCreate,
  JobRead,
  KeywordSearchRequest,
  KeywordSearchResponse,
  TikTokStatus,
  TikTokVideo,
  VideoListResponse,
  XBillingStatus,
  XUsageLedgerItem,
  XStatus,
  YouTubeSearchResponse,
  PlatformStatusItem,
} from "../types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : window.location.origin);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    });
  } catch (err) {
    throw new Error("Network request failed. Check that VITE_API_BASE_URL points to the running backend.");
  }
  if (!response.ok) {
    const detail = await response.text();
    const lowerDetail = detail.toLowerCase();
    if (response.status === 400 && detail.includes("API Key")) throw new Error("API Key is not configured.");
    if (detail.includes("X_BEARER_TOKEN") || detail.includes("x_bearer_token_missing")) throw new Error("X_BEARER_TOKEN is not configured.");
    if (lowerDetail.includes("x api") && (response.status === 402 || lowerDetail.includes("credits"))) throw new Error("X API credits are insufficient.");
    if (lowerDetail.includes("x api") && (response.status === 403 || lowerDetail.includes("permission"))) throw new Error("X API permission is insufficient.");
    if (lowerDetail.includes("x api") && (response.status === 429 || lowerDetail.includes("rate limit"))) throw new Error("X API rate limit reached.");
    if (response.status === 429 || lowerDetail.includes("quota")) throw new Error("YouTube API quota is insufficient.");
    if (lowerDetail.includes("x api")) throw new Error(`X API request failed: ${detail || response.statusText}`);
    if (response.status >= 500) throw new Error(`Backend or YouTube API request failed: ${detail || response.statusText}`);
    throw new Error(detail || response.statusText);
  }
  return response.json() as Promise<T>;
}

export const api = {
  createJob(payload: JobCreate) {
    return request<{ id: string; status: string }>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listJobs() {
    return request<JobRead[]>("/api/jobs");
  },
  platformStatus() {
    return request<Record<string, PlatformStatusItem>>("/api/platform-status");
  },
  xStatus() {
    return request<XStatus>("/api/x/status");
  },
  xBillingStatus() {
    return request<XBillingStatus>("/api/x/billing/status");
  },
  xBillingUsage(limit = 10) {
    return request<{ items: XUsageLedgerItem[] }>(`/api/x/billing/usage?limit=${limit}`);
  },
  updateXBalance(balanceUsd: number) {
    return request<{ status: string; balance_usd: number; created_at: string }>("/api/x/billing/balance", {
      method: "POST",
      body: JSON.stringify({ balance_usd: balanceUsd }),
    });
  },
  xOfficialUsage() {
    return request<Record<string, unknown>>("/api/x/usage/official");
  },
  searchKeywords(payload: KeywordSearchRequest) {
    return request<KeywordSearchResponse>("/api/search/keywords", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  searchYouTube(keyword: string, maxResults = 5) {
    const query = new URLSearchParams({
      keyword,
      max_results: String(maxResults),
    });
    return request<YouTubeSearchResponse>(`/api/youtube/search?${query.toString()}`);
  },
  listVideos(params: Record<string, string | number | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<VideoListResponse>(`/api/videos?${query.toString()}`);
  },
  deleteVideo(id: number) {
    return request<{ status: string; id: number }>(`/api/videos/${id}`, { method: "DELETE" });
  },
  deleteAllVideos() {
    return request<{ status: string; count: number }>("/api/videos", { method: "DELETE" });
  },
  health() {
    return request<{ status: string; service: string; message?: string }>("/api/health");
  },
  tiktokAuthUrl() {
    return request<{ auth_url: string; state: string }>("/api/tiktok/auth-url");
  },
  tiktokStatus() {
    return request<TikTokStatus>("/api/tiktok/status");
  },
  refreshTikTokToken() {
    return request<TikTokStatus>("/api/tiktok/token/refresh", { method: "POST" });
  },
  listTikTokVideos(params: { cursor?: number; max_count?: number } = {}) {
    const query = new URLSearchParams();
    if (params.cursor !== undefined) query.set("cursor", String(params.cursor));
    if (params.max_count !== undefined) query.set("max_count", String(params.max_count));
    return request<{ data?: { videos?: TikTokVideo[]; cursor?: number; has_more?: boolean }; videos?: TikTokVideo[] }>(
      `/api/tiktok/user/videos?${query.toString()}`,
    );
  },
  queryTikTokVideos(videoIds: string[]) {
    return request<{ videos: TikTokVideo[]; errors: string[] }>("/api/tiktok/videos/query", {
      method: "POST",
      body: JSON.stringify({ video_ids: videoIds }),
    });
  },
  csvUrl(params: Record<string, string | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return `${API_BASE_URL}/api/export/csv?${query.toString()}`;
  },
};
