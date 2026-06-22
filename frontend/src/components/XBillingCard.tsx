import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { XBillingStatus, XStatus, XUsageLedgerItem } from "../types";

function money(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function XBillingCard() {
  const [status, setStatus] = useState<XBillingStatus>();
  const [xStatus, setXStatus] = useState<XStatus>();
  const [usage, setUsage] = useState<XUsageLedgerItem[]>([]);
  const [syncStatus, setSyncStatus] = useState("Not synced");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [billing, ledger, platformStatus] = await Promise.all([api.xBillingStatus(), api.xBillingUsage(5), api.xStatus()]);
      setStatus(billing);
      setXStatus(platformStatus);
      setUsage(ledger.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load X billing status");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function syncOfficialUsage() {
    setSyncStatus("Syncing...");
    try {
      await api.xOfficialUsage();
      setSyncStatus("Official usage sync succeeded");
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : "Official usage sync failed");
    }
  }

  const remaining = status?.estimated_remaining_balance ?? 0;
  const tone = remaining <= 0 ? "danger" : remaining < 1 ? "warn" : "ok";

  return (
    <section className="dashboard-card x-billing-card" data-tone={tone}>
      <div className="panel-heading">
        <div>
          <h2>X API Billing</h2>
          <span>{status?.configured ? "Available for local cost estimates" : "X_BEARER_TOKEN not configured"}</span>
        </div>
        <button className="secondary-button" onClick={syncOfficialUsage} type="button">
          Sync official usage
        </button>
      </div>
      {error && <div className="warning-banner">{error}</div>}
      <div className="billing-grid">
        <div>
          <span>X status</span>
          <strong>{xStatus?.message || (status?.configured ? "Available" : "Not configured")}</strong>
        </div>
        <div>
          <span>Estimated remaining</span>
          <strong>{money(status?.estimated_remaining_balance)}</strong>
        </div>
        <div>
          <span>Spent today</span>
          <strong>{money(status?.estimated_spent_today)}</strong>
        </div>
        <div>
          <span>Spent this month</span>
          <strong>{money(status?.estimated_spent_month)}</strong>
        </div>
        <div>
          <span>Last request cost</span>
          <strong>{money(status?.last_x_request_cost)}</strong>
        </div>
        <div>
          <span>Official usage sync</span>
          <strong>{syncStatus}</strong>
        </div>
      </div>
      {remaining < 1 && (
        <div className={remaining <= 0 ? "error-banner" : "warning-banner"}>
          {remaining <= 0 ? "X API credits may be insufficient." : "X API estimated balance is low."}
        </div>
      )}
      <div className="usage-ledger">
        <strong>X API usage records</strong>
        {usage.length === 0 ? (
          <span>No X usage records yet.</span>
        ) : (
          usage.map((item) => (
            <div className="usage-row" key={item.id}>
              <span>{new Date(item.created_at).toLocaleString()}</span>
              <span>{item.keyword || "-"}</span>
              <span>{item.posts_returned} posts</span>
              <span>{money(item.estimated_total_cost)}</span>
              <span>{item.status}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
