import { useEffect, useState } from "react";
import { api } from "../api/client";

export function BackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [message, setMessage] = useState("Checking backend...");

  useEffect(() => {
    api
      .health()
      .then(() => {
        setOnline(true);
        setMessage("Online");
      })
      .catch(() => {
        setOnline(false);
        setMessage("Offline - start the backend server");
      });
  }, []);

  return (
    <div className="backend-status" data-online={online === true}>
      <span />
      <strong>Backend status</strong>
      <em>{message}</em>
    </div>
  );
}
