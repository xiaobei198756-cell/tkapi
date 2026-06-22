import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { JobCreate, Platform, PlatformStatusItem } from "../types";

type PlatformConfigStatus = Record<string, PlatformStatusItem>;

const basePlatforms: Array<{ id: Platform; label: string; enabled: boolean; note: string }> = [
  { id: "youtube", label: "YouTube", enabled: true, note: "Available" },
  { id: "x", label: "X", enabled: false, note: "Not configured" },
  { id: "tiktok", label: "TikTok", enabled: false, note: "Not configured" },
  { id: "instagram", label: "Instagram", enabled: false, note: "Coming soon" },
  { id: "facebook", label: "Facebook", enabled: false, note: "Coming soon" },
];

const tiktokPermissionMessage =
  "TikTok official Research API / keyword search permission has not been approved yet.";
const tiktokNotConfiguredMessage =
  "Please configure TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in backend/.env.";
const tiktokPermissionAlert =
  "TikTok official Research API / keyword search permission has not been approved yet.";

interface Props {
  onSubmit: (payload: JobCreate) => Promise<void>;
}

export function JobForm({ onSubmit }: Props) {
  const [keywords, setKeywords] = useState("crypto\nai news\nbitcoin");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["youtube"]);
  const [maxResults, setMaxResults] = useState(10);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [refreshInterval, setRefreshInterval] = useState("");
  const [busy, setBusy] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<PlatformConfigStatus>({});
  const [platformStatusError, setPlatformStatusError] = useState("");

  useEffect(() => {
    api
      .platformStatus()
      .then(async (data) => {
        setPlatformStatus(data);
        try {
          const x = await api.xStatus();
          setPlatformStatus((current) => ({ ...current, x }));
        } catch {
          setPlatformStatus((current) => ({
            ...current,
            x: {
              ...(current.x || { configured: false, message: "X API request failed" }),
              available: false,
              status: "request_failed",
              message: "X API request failed",
            },
          }));
        }
        try {
          const tiktok = await api.tiktokStatus();
          setPlatformStatus((current) => ({
            ...current,
            tiktok: {
              ...tiktok,
              configured: Boolean(tiktok.configured),
              message: tiktok.message || (tiktok.configured ? "API not approved" : "Not configured"),
            },
          }));
        } catch {
          setPlatformStatus((current) => ({
            ...current,
            tiktok: {
              ...(current.tiktok || { configured: false, message: "TikTok status request failed" }),
              available: false,
              status: "request_failed",
              message: "TikTok status request failed",
            },
          }));
        }
      })
      .catch((err) => {
        setPlatformStatusError(err instanceof Error ? err.message : "Unable to load platform status");
      });
  }, []);

  const platforms = useMemo(
    () =>
      basePlatforms.map((platform) => {
        const status = platformStatus[platform.id];
        if (platform.id === "youtube") {
          return {
            ...platform,
            enabled: status ? Boolean(status.available ?? status.configured) : true,
            note: status?.message || "Available",
          };
        }
        if (platform.id === "x") {
          return {
            ...platform,
            enabled: Boolean(status?.available ?? status?.configured),
            note: status?.message || "Not configured",
          };
        }
        if (platform.id === "tiktok") {
          const isConfigured = Boolean(status?.configured || status?.has_client_key || status?.has_client_secret);
          const isAvailable = Boolean(status?.available && status?.keyword_search_enabled);
          return {
            ...platform,
            enabled: isAvailable,
            note: isAvailable ? "Available" : isConfigured ? status?.message || "API not approved" : status?.message || "Not configured",
          };
        }
        return { ...platform, enabled: false, note: status?.message || "Coming soon" };
      }),
    [platformStatus],
  );

  const keywordCount = keywords
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const xResultCount = Math.max(10, Math.min(maxResults, 50));
  const xEstimatedCost = keywordCount * xResultCount * 0.005;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const unavailable = selectedPlatforms.filter((platform) => {
      const item = platforms.find((candidate) => candidate.id === platform);
      return !item?.enabled;
    });
    if (unavailable.length) {
      window.alert("This platform API is not configured or permission is not enabled. Configure official API credentials and confirm access first.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        keywords: keywords
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean),
        platforms: selectedPlatforms,
        max_results: maxResults,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
        refresh_interval_minutes: refreshInterval ? Number(refreshInterval) : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  function togglePlatform(platform: Platform) {
    const item = platforms.find((candidate) => candidate.id === platform);
    if (!item?.enabled) {
      if (platform === "tiktok") {
        window.alert(platformStatus.tiktok?.configured ? tiktokPermissionAlert : tiktokNotConfiguredMessage);
      }
      return;
    }
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    );
  }

  function platformTitle(platform: { id: Platform; enabled: boolean; note: string }) {
    if (
      platform.id === "tiktok" &&
      !platform.enabled
    ) {
      return platformStatus.tiktok?.configured ? tiktokPermissionMessage : tiktokNotConfiguredMessage;
    }
    return platform.note;
  }

  function resetForm() {
    setKeywords("crypto\nai news\nbitcoin");
    setSelectedPlatforms(["youtube"]);
    setMaxResults(10);
    setDateStart("");
    setDateEnd("");
    setRefreshInterval("");
  }

  return (
    <form className="job-form dashboard-card" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <h2>Collection Setup</h2>
          <span>Launch keyword-based official API collection</span>
        </div>
      </div>
      {platformStatusError && <div className="warning-banner">{platformStatusError}</div>}

      <label>
        <span>Keywords</span>
        <textarea
          placeholder="crypto, ai news, bitcoin"
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          rows={4}
        />
      </label>

      <div className="field-group">
        <span>Platforms</span>
        <div className="platform-grid">
          {platforms.map((platform) => (
            <label
              className="platform-option"
              data-disabled={!platform.enabled}
              key={platform.id}
              onClick={(event) => {
                if (!platform.enabled) {
                  event.preventDefault();
                  togglePlatform(platform.id);
                }
              }}
              title={platformTitle(platform)}
            >
              <input
                checked={selectedPlatforms.includes(platform.id)}
                onChange={() => togglePlatform(platform.id)}
                readOnly={!platform.enabled}
                type="checkbox"
              />
              <span>{platform.label}</span>
              <em>{platform.note}</em>
            </label>
          ))}
        </div>
      </div>
      {selectedPlatforms.includes("x") && (
        <div className="cost-estimate">
          {keywordCount} keywords x {xResultCount} posts x $0.005 = ${xEstimatedCost.toFixed(2)} estimated
          cost. User reads may add additional cost.
        </div>
      )}

      <div className="form-grid">
        <label>
          <span>Max results</span>
          <input min={1} max={50} onChange={(event) => setMaxResults(Number(event.target.value))} type="number" value={maxResults} />
        </label>
        <label>
          <span>Date start</span>
          <input onChange={(event) => setDateStart(event.target.value)} type="date" value={dateStart} />
        </label>
        <label>
          <span>Date end</span>
          <input onChange={(event) => setDateEnd(event.target.value)} type="date" value={dateEnd} />
        </label>
        <label>
          <span>Refresh minutes</span>
          <input min={5} onChange={(event) => setRefreshInterval(event.target.value)} placeholder="optional" type="number" value={refreshInterval} />
        </label>
      </div>

      <div className="form-actions">
        <button className="primary-button large-button" disabled={busy || selectedPlatforms.length === 0} type="submit">
          {busy ? "Starting..." : "Start collection"}
        </button>
        <button className="secondary-button" onClick={resetForm} type="button">
          Reset filters
        </button>
      </div>
    </form>
  );
}
