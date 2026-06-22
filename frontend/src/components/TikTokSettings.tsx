import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { TikTokStatus, TikTokVideo } from "../types";

function formatDate(value?: number | string | null) {
  if (!value) return "-";
  const numeric = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatCount(value?: number | null) {
  return value === null || value === undefined ? "-" : value.toLocaleString();
}

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "TikTok API request failed.";
  if (message.includes("401")) return "TikTok is not connected or token expired. Connect TikTok again.";
  if (message.includes("scope") || message.includes("permission")) {
    return "TikTok scope is insufficient. Apply for the required scope in TikTok Developer Center.";
  }
  return message;
}

export function TikTokSettings() {
  const [status, setStatus] = useState<TikTokStatus>({ connected: false });
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    try {
      setStatus(await api.tiktokStatus());
    } catch (err) {
      setMessage(apiError(err));
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function connectTikTok() {
    try {
      setMessage("");
      const data = await api.tiktokAuthUrl();
      window.location.href = data.auth_url;
    } catch (err) {
      setMessage(apiError(err));
    }
  }

  async function refreshToken() {
    try {
      setLoading(true);
      setMessage("");
      setStatus(await api.refreshTikTokToken());
    } catch (err) {
      setMessage(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadVideos() {
    try {
      setLoading(true);
      setMessage("");
      const data = await api.listTikTokVideos({ max_count: 20 });
      setVideos(data.data?.videos || data.videos || []);
      if (!(data.data?.videos || data.videos || []).length) setMessage("No TikTok videos returned.");
    } catch (err) {
      setMessage(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="table-panel dashboard-card">
      <div className="panel-heading table-heading">
        <div>
          <h2>TikTok API Settings</h2>
          <span>Official OAuth and Display API connection</span>
        </div>
        <div className="table-actions">
          <button className="primary-button" onClick={connectTikTok} type="button">
            Connect TikTok Account
          </button>
          <button className="secondary-button" disabled={!status.connected || loading} onClick={refreshToken} type="button">
            Refresh Token
          </button>
          <button className="secondary-button" disabled={!status.connected || loading} onClick={loadVideos} type="button">
            Get My Videos
          </button>
        </div>
      </div>

      <div className="status-strip compact-status">
        <div className="status-pill" data-tone={status.connected ? "ok" : "warn"}>
          <strong>{status.connected ? "TikTok connected" : "TikTok not connected"}</strong>
          <span>{status.connected ? `open_id: ${status.open_id || "-"}` : "Click Connect TikTok Account to authorize."}</span>
        </div>
        <div className="status-pill">
          <strong>Scope</strong>
          <span>{status.scope || "-"}</span>
        </div>
        <div className="status-pill">
          <strong>Token expires</strong>
          <span>{status.expires_at ? new Date(status.expires_at).toLocaleString() : "-"}</span>
        </div>
      </div>

      {message && <div className="error-banner">{message}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Video title</th>
              <th>Video link</th>
              <th>Published</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Shares</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id}>
                <td>
                  <span className="title-link" title={video.title || video.video_description || video.id}>
                    {video.title || video.video_description || video.id}
                  </span>
                </td>
                <td>
                  {video.share_url ? (
                    <a className="open-button" href={video.share_url} rel="noreferrer" target="_blank">
                      Open
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{formatDate(video.create_time)}</td>
                <td>{formatCount(video.view_count)}</td>
                <td>{formatCount(video.like_count)}</td>
                <td>{formatCount(video.comment_count)}</td>
                <td>{formatCount(video.share_count)}</td>
                <td>{video.duration ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
