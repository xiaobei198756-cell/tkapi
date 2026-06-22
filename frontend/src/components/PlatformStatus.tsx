import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { PlatformStatusItem } from "../types";

const labels: Record<string, string> = {
  youtube: "YouTube",
  x: "X",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

const tiktokPermissionMessage =
  "TikTok official Research API / keyword search permission has not been approved yet.";

export function PlatformStatus() {
  const [status, setStatus] = useState<Record<string, PlatformStatusItem>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .platformStatus()
      .then(async (data) => {
        setStatus(data);
        try {
          const x = await api.xStatus();
          setStatus((current) => ({ ...current, x }));
        } catch {
          setStatus((current) => ({
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
          setStatus((current) => ({
            ...current,
            tiktok: {
              ...tiktok,
              configured: Boolean(tiktok.configured),
              message: tiktok.message || (tiktok.configured ? "API not approved" : "Not configured"),
            },
          }));
        } catch {
          setStatus((current) => ({
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
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load platform status"));
  }, []);

  return (
    <section className="status-strip">
      {error && (
        <div className="status-pill" data-tone="warn">
          <strong>Platform status</strong>
          <span>{error}</span>
        </div>
      )}
      {Object.entries(labels).map(([platform, label]) => {
        const item = status[platform];
        const tone = item?.available || item?.status === "available" ? "ok" : item?.status === "coming_soon" ? "muted" : "warn";
        const title =
          platform === "tiktok" && item?.configured && item?.status === "api_not_approved"
            ? tiktokPermissionMessage
            : item?.message || "";
        return (
          <div className="status-pill" data-tone={tone} key={platform} title={title}>
            <strong>{label}</strong>
            <span>{item?.message || "Checking configuration..."}</span>
          </div>
        );
      })}
    </section>
  );
}
