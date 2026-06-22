import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../api/client";
import type { ProgressEvent } from "../types";

interface Props {
  jobId?: string;
  onFinished?: () => void;
}

export function JobProgress({ jobId, onFinished }: Props) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const notifiedJobRef = useRef<string | undefined>();

  const wsUrl = useMemo(() => API_BASE_URL.replace(/^http/, "ws"), []);

  useEffect(() => {
    if (!jobId) return;
    setEvents([]);
    notifiedJobRef.current = undefined;
    const socket = new WebSocket(`${wsUrl}/ws/jobs/${jobId}`);
    socket.onmessage = (message) => {
      setEvents((current) => [JSON.parse(message.data), ...current].slice(0, 30));
    };
    return () => socket.close();
  }, [jobId, wsUrl]);

  useEffect(() => {
    const latest = events[0];
    if (
      latest &&
      jobId &&
      notifiedJobRef.current !== jobId &&
      ["success", "partial_failed", "failed"].includes(latest.status)
    ) {
      notifiedJobRef.current = jobId;
      onFinished?.();
    }
  }, [events, jobId, onFinished]);

  const latest = events[0];
  const percent = latest?.total ? Math.round(((latest.completed || 0) / latest.total) * 100) : 0;
  const displayStatus =
    latest?.status === "success" || latest?.status === "partial_failed"
      ? "completed"
      : latest?.status === "running"
        ? "running"
        : latest?.status === "failed" || latest?.status === "error"
          ? "failed"
          : "idle";
  const completedMessage =
    displayStatus === "completed"
      ? latest?.message || "Collection completed successfully."
      : latest?.error_message || latest?.message || "Waiting for collection.";

  return (
    <section className="progress-panel dashboard-card" data-status={displayStatus}>
      <div className="panel-heading">
        <div>
          <h2>Progress</h2>
          <span>{jobId ? `Job #${jobId}` : "No active job"}</span>
        </div>
        <div className="status-indicator" data-status={displayStatus}>
          {displayStatus === "running" && <span className="spinner" />}
          {displayStatus}
        </div>
      </div>
      <div className="progress-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        <strong>{displayStatus === "completed" ? "Collected YouTube videos successfully" : displayStatus}</strong>
        <span>{completedMessage}</span>
      </div>
      <div className="event-list">
        {events.map((event, index) => (
          <div className="event-row" key={`${event.timestamp}-${index}`}>
            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            <p>{event.message || event.source_status || event.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
