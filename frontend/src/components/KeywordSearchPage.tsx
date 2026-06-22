import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { KeywordSearchItem, Platform } from "../types";

const platforms: Array<{ id: Platform; label: string }> = [
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
];

function formatNumber(value?: number | null) {
  return value === null || value === undefined ? "-" : value.toLocaleString();
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export function KeywordSearchPage() {
  const [keyword, setKeyword] = useState("crypto prediction market");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["youtube"]);
  const [minViews, setMinViews] = useState("");
  const [minLikes, setMinLikes] = useState("");
  const [dateRange, setDateRange] = useState("7d");
  const [limit, setLimit] = useState(50);
  const [items, setItems] = useState<KeywordSearchItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setWarnings([]);
    try {
      const result = await api.searchKeywords({
        keyword,
        platforms: selectedPlatforms,
        min_views: minViews ? Number(minViews) : undefined,
        min_likes: minLikes ? Number(minLikes) : undefined,
        date_range: dateRange,
        limit,
      });
      setItems(result.items);
      setWarnings(result.warnings);
      if (!result.items.length && !result.warnings.length) setError("No video data matched the current filters.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keyword search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>Keyword Search</h2>
        <p>Search platform video data with official APIs and permission-aware responses.</p>
      </div>

      <form className="dashboard-card keyword-search-form" onSubmit={submit}>
        <label>
          <span>Keyword</span>
          <input onChange={(event) => setKeyword(event.target.value)} value={keyword} />
        </label>
        <div className="field-group">
          <span>Platforms</span>
          <div className="platform-grid">
            {platforms.map((platform) => (
              <label className="platform-option" key={platform.id}>
                <input
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => togglePlatform(platform.id)}
                  type="checkbox"
                />
                <span>{platform.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>Min views</span>
            <input onChange={(event) => setMinViews(event.target.value)} placeholder="1000" type="number" value={minViews} />
          </label>
          <label>
            <span>Min likes</span>
            <input onChange={(event) => setMinLikes(event.target.value)} placeholder="100" type="number" value={minLikes} />
          </label>
          <label>
            <span>Date range</span>
            <select onChange={(event) => setDateRange(event.target.value)} value={dateRange}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="">Any time</option>
            </select>
          </label>
          <label>
            <span>Max results</span>
            <input max={100} min={1} onChange={(event) => setLimit(Number(event.target.value))} type="number" value={limit} />
          </label>
        </div>
        <button className="primary-button large-button" disabled={loading || !keyword.trim() || selectedPlatforms.length === 0} type="submit">
          {loading ? "Searching..." : "Start Search"}
        </button>
      </form>

      {warnings.map((warning) => (
        <div className="warning-banner" key={warning}>
          {warning}
        </div>
      ))}
      {error && <div className="error-banner">{error}</div>}

      <div className="table-panel dashboard-card">
        <div className="panel-heading">
          <div>
            <h2>Search Results</h2>
            <span>{items.length.toLocaleString()} videos returned</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Keyword</th>
                <th>Video title</th>
                <th>Video link</th>
                <th>Author</th>
                <th>Published</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Favorites</th>
                <th>Shares</th>
                <th>Collected</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.platform}-${item.keyword}-${item.video_url || item.title || item.collected_at}`}>
                  <td>{item.platform}</td>
                  <td>{item.keyword}</td>
                  <td>
                    <a className="title-link" href={item.video_url || "#"} rel="noreferrer" target="_blank" title={item.title || item.video_url || ""}>
                      {item.title || item.video_url || "-"}
                    </a>
                  </td>
                  <td>
                    {item.video_url ? (
                      <a className="open-button" href={item.video_url} rel="noreferrer" target="_blank">
                        Open
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{item.author || "-"}</td>
                  <td>{formatDate(item.published_at)}</td>
                  <td>{formatNumber(item.likes)}</td>
                  <td>{formatNumber(item.comments)}</td>
                  <td>{formatNumber(item.favorites)}</td>
                  <td>{formatNumber(item.shares)}</td>
                  <td>{formatDate(item.collected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
