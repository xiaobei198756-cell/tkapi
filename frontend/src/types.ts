export type Platform = "youtube" | "tiktok" | "x" | "instagram" | "facebook";

export interface JobCreate {
  keywords: string[];
  platforms: Platform[];
  max_results: number;
  date_start?: string;
  date_end?: string;
  refresh_interval_minutes?: number;
}

export interface JobRead {
  id: string;
  keywords_json: string;
  platforms_json: string;
  max_results: number;
  date_start?: string | null;
  date_end?: string | null;
  refresh_interval_minutes?: number | null;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoRecord {
  id: number;
  platform: Platform;
  keyword: string;
  video_url?: string | null;
  title?: string | null;
  author?: string | null;
  published_at?: string | null;
  likes?: number | null;
  comments?: number | null;
  favorites?: number | null;
  shares?: number | null;
  collected_at: string;
}

export interface VideoListResponse {
  items: VideoRecord[];
  total: number;
}

export interface ProgressEvent {
  job_id: string;
  status: string;
  completed?: number;
  total?: number;
  platform?: Platform;
  keyword?: string;
  message?: string;
  error_message?: string | null;
  source_status?: string;
  timestamp: string;
}

export interface YouTubeSearchItem {
  platform: "youtube";
  keyword: string;
  video_url: string;
  title?: string | null;
  author?: string | null;
  published_at?: string | null;
  likes?: number | null;
  comments?: number | null;
  favorites?: number | null;
  shares?: number | null;
  collected_at: string;
}

export interface YouTubeSearchResponse {
  keyword: string;
  total: number;
  items: YouTubeSearchItem[];
  message?: string | null;
}

export interface TikTokStatus {
  platform?: string;
  configured?: boolean;
  available?: boolean;
  status?: string;
  message?: string;
  keyword_search_enabled?: boolean;
  provider?: string;
  has_client_key?: boolean;
  has_client_secret?: boolean;
  has_access_token?: boolean;
  connected: boolean;
  open_id?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expires_at?: string | null;
  refresh_expires_at?: string | null;
  updated_at?: string | null;
}

export interface XStatus {
  platform?: string;
  configured: boolean;
  available?: boolean;
  status?: string;
  has_bearer_token: boolean;
  has_api_key?: boolean;
  has_api_secret?: boolean;
  has_access_token?: boolean;
  has_access_token_secret?: boolean;
  message: string;
}

export interface XBillingStatus {
  configured: boolean;
  starting_balance: number;
  estimated_spent_today: number;
  estimated_spent_month: number;
  estimated_remaining_balance: number;
  last_x_request_cost: number;
  message: string;
}

export interface XUsageLedgerItem {
  id: number;
  created_at: string;
  job_id?: string | null;
  keyword?: string | null;
  endpoint: string;
  posts_returned: number;
  users_returned: number;
  estimated_post_cost: number;
  estimated_user_cost: number;
  estimated_total_cost: number;
  balance_before: number;
  balance_after: number;
  status: string;
  error_message?: string | null;
}

export interface PlatformStatusItem {
  platform?: string;
  has_client_key?: boolean;
  has_client_secret?: boolean;
  provider?: string;
  configured: boolean;
  available?: boolean;
  status?: string;
  message: string;
  keyword_search_enabled?: boolean;
  has_access_token?: boolean;
}

export interface TikTokVideo {
  id: string;
  title?: string | null;
  video_description?: string | null;
  create_time?: number | string | null;
  share_url?: string | null;
  cover_image_url?: string | null;
  duration?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  share_count?: number | null;
  view_count?: number | null;
}

export interface KeywordSearchRequest {
  keyword: string;
  platforms: Platform[];
  min_views?: number;
  min_likes?: number;
  date_range?: string;
  limit: number;
}

export interface KeywordSearchItem {
  platform: string;
  keyword: string;
  video_url?: string | null;
  title?: string | null;
  author?: string | null;
  published_at?: string | null;
  likes?: number | null;
  comments?: number | null;
  favorites?: number | null;
  shares?: number | null;
  collected_at: string;
  message?: string | null;
}

export interface KeywordSearchResponse {
  items: KeywordSearchItem[];
  warnings: string[];
}
