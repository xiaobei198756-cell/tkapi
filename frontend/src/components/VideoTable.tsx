import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Platform, VideoRecord } from "../types";

const sortFields = ["likes", "comments", "favorites", "shares", "published_at", "collected_at"];
const quickSorts = [
  { label: "Likes", field: "likes" },
  { label: "Comments", field: "comments" },
  { label: "Favorites", field: "favorites" },
  { label: "Shares", field: "shares" },
  { label: "Published", field: "published_at" },
  { label: "Collected", field: "collected_at" },
];

interface Props {
  refreshKey?: number;
  initialPlatform?: string;
  initialKeyword?: string;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function formatNumber(value?: number | null) {
  return value === null || value === undefined ? "-" : value.toLocaleString();
}

function csvName(platform: Platform | "", keyword: string) {
  const date = new Date().toISOString().slice(0, 10);
  const keywordPart = keyword.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "videos";
  return `social_video_tracker_${keywordPart}_${date}.csv`;
}

export function VideoTable({ refreshKey = 0, initialPlatform = "youtube", initialKeyword = "" }: Props) {
  const [items, setItems] = useState<VideoRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState<Platform | "">(initialPlatform as Platform | "");
  const [keyword, setKeyword] = useState(initialKeyword);
  const [title, setTitle] = useState("");
  const [sortBy, setSortBy] = useState("likes");
  const [order, setOrder] = useState("desc");
  const [cleared, setCleared] = useState(false);

  const stats = useMemo(() => {
    const totalLikes = items.reduce((sum, video) => sum + (video.likes || 0), 0);
    const totalComments = items.reduce((sum, video) => sum + (video.comments || 0), 0);
    const totalFavorites = items.reduce((sum, video) => sum + (video.favorites || 0), 0);
    const totalShares = items.reduce((sum, video) => sum + (video.shares || 0), 0);
    const best = [...items].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
    const keywordLikes = items.reduce<Record<string, number>>((map, video) => {
      map[video.keyword] = (map[video.keyword] || 0) + (video.likes || 0);
      return map;
    }, {});
    const bestKeyword = Object.entries(keywordLikes).sort((a, b) => b[1] - a[1])[0];
    return {
      totalVideos: items.length,
      totalLikes,
      totalComments,
      totalFavorites,
      totalShares,
      averageLikes: items.length ? Math.round(totalLikes / items.length) : 0,
      bestTitle: best?.title || best?.video_url || "-",
      bestKeyword: bestKeyword ? `${bestKeyword[0]} (${formatNumber(bestKeyword[1])} likes)` : "-",
    };
  }, [items]);

  function applyQuickSort(field: string) {
    setSortBy(field);
    setOrder("desc");
    setCleared(false);
  }

  function resetFilters() {
    setPlatform(initialPlatform as Platform | "");
    setKeyword(initialKeyword);
    setTitle("");
    setSortBy("likes");
    setOrder("desc");
    setCleared(false);
  }

  function clearResults() {
    setItems([]);
    setTotal(0);
    setError("");
    setCleared(true);
  }

  async function load() {
    try {
      setError("");
      const data = await api.listVideos({ platform, keyword, title, sort_by: sortBy, order, limit: 100 });
      setItems(data.items);
      setTotal(data.total);
      setCleared(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load video records");
    }
  }

  async function deleteOne(id: number) {
    if (!window.confirm("Delete this video record?")) return;
    try {
      await api.deleteVideo(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setTotal((value) => Math.max(0, value - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete video record");
    }
  }

  async function deleteAll() {
    if (!window.confirm("Delete all video records from the database? This cannot be undone.")) return;
    try {
      await api.deleteAllVideos();
      clearResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete all records");
    }
  }

  useEffect(() => {
    if (cleared) return;
    load();
  }, [platform, keyword, title, sortBy, order, refreshKey, cleared]);

  return (
    <section className="table-panel dashboard-card">
      <div className="panel-heading table-heading">
        <div>
          <h2>Video Records</h2>
          <span>{total.toLocaleString()} records matching current filters</span>
        </div>
        <div className="table-actions">
          <button className="secondary-button" onClick={clearResults} type="button">
            Clear results
          </button>
          <button className="danger-button" onClick={deleteAll} type="button">
            Delete all records
          </button>
          <button className="secondary-button" onClick={resetFilters} type="button">
            Reset filters
          </button>
          <a className="secondary-button" download={csvName(platform, keyword)} href={api.csvUrl({ platform, keyword, title })}>
            Export CSV
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total videos</span>
          <strong>{formatNumber(stats.totalVideos)}</strong>
        </div>
        <div className="stat-card">
          <span>Total likes</span>
          <strong>{formatNumber(stats.totalLikes)}</strong>
        </div>
        <div className="stat-card">
          <span>Total comments</span>
          <strong>{formatNumber(stats.totalComments)}</strong>
        </div>
        <div className="stat-card">
          <span>Total favorites</span>
          <strong>{formatNumber(stats.totalFavorites)}</strong>
        </div>
        <div className="stat-card">
          <span>Total shares</span>
          <strong>{formatNumber(stats.totalShares)}</strong>
        </div>
        <div className="stat-card">
          <span>Average likes</span>
          <strong>{formatNumber(stats.averageLikes)}</strong>
        </div>
        <div className="stat-card stat-card-wide">
          <span>Best video by likes</span>
          <strong title={stats.bestTitle}>{stats.bestTitle}</strong>
        </div>
        <div className="stat-card stat-card-wide">
          <span>Best keyword by total likes</span>
          <strong title={stats.bestKeyword}>{stats.bestKeyword}</strong>
        </div>
      </div>

      <div className="filters compact-filters">
        <select
          onChange={(event) => {
            setCleared(false);
            setPlatform(event.target.value as Platform | "");
          }}
          value={platform}
        >
          <option value="youtube">YouTube only</option>
          <option value="">All platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="x">X</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
        </select>
        <input
          onChange={(event) => {
            setCleared(false);
            setKeyword(event.target.value);
          }}
          placeholder="Filter keyword"
          value={keyword}
        />
        <input
          onChange={(event) => {
            setCleared(false);
            setTitle(event.target.value);
          }}
          placeholder="Search title"
          value={title}
        />
        <select
          onChange={(event) => {
            setCleared(false);
            setSortBy(event.target.value);
          }}
          value={sortBy}
        >
          {sortFields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
        <select
          onChange={(event) => {
            setCleared(false);
            setOrder(event.target.value);
          }}
          value={order}
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      <div className="quick-sort-row">
        {quickSorts.map((sort) => (
          <button
            className="sort-button"
            data-active={sortBy === sort.field && order === "desc"}
            key={sort.field}
            onClick={() => applyQuickSort(sort.field)}
            type="button"
          >
            Sort by {sort.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap">
        <table className="video-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Platform</th>
              <th>Keyword</th>
              <th>Title</th>
              <th>Author</th>
              <th>Published</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Favorites</th>
              <th>Shares</th>
              <th>Video URL</th>
              <th>Collected</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((video, index) => (
              <tr key={video.id}>
                <td className="rank-cell">{index + 1}</td>
                <td>{video.platform}</td>
                <td>{video.keyword}</td>
                <td>
                  <a className="title-link" href={video.video_url || "#"} rel="noreferrer" target="_blank" title={video.title || video.video_url || ""}>
                    {video.title || video.video_url || "-"}
                  </a>
                </td>
                <td>{video.author || "-"}</td>
                <td>{formatDate(video.published_at)}</td>
                <td className="metric-cell">{formatNumber(video.likes)}</td>
                <td className="metric-cell">{formatNumber(video.comments)}</td>
                <td className="metric-cell">{formatNumber(video.favorites)}</td>
                <td className="metric-cell">{formatNumber(video.shares)}</td>
                <td>
                  {video.video_url ? (
                    <a className="open-button" href={video.video_url} rel="noreferrer" target="_blank">
                      Open
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{formatDate(video.collected_at)}</td>
                <td>
                  <button className="link-danger-button" onClick={() => deleteOne(video.id)} type="button">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
