"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollText, X } from "lucide-react";
import { containers as containersApi, type Container } from "@/lib/api";
import { sanitizeLogText } from "@/lib/terminal-output";

interface ContainerLogsModalProps {
  container: Container;
  onClose: () => void;
}

export default function ContainerLogsModal({
  container,
  onClose,
}: ContainerLogsModalProps) {
  const [logs, setLogs] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containersApi
      .logs(container.id, 200)
      .then((response) =>
        setLogs(sanitizeLogText(response.data?.logs || "(no output)")),
      )
      .catch((err) =>
        setLogs(
          sanitizeLogText(
            "Error: " + (err instanceof Error ? err.message : "Failed"),
          ),
        ),
      )
      .finally(() => setLoading(false));
  }, [container.id]);

  useEffect(() => {
    if (loading) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const scrollFrame = window.requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });

    return () => window.cancelAnimationFrame(scrollFrame);
  }, [logs, loading]);

  return (
    <div className="modal-overlay">
      <div className="modal-shell" style={{ maxWidth: 760 }}>
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close logs modal"
        >
          <X size={22} />
        </button>
      <div
        className="modal animate-slide-in"
        style={{
          width: "100%",
          maxWidth: 760,
          padding: 0,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            paddingRight: 52,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ScrollText size={16} style={{ color: "var(--accent)" }} />
            <h3
              style={{
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Logs - {container.name}
            </h3>
          </div>
        </div>
        <div
          ref={viewportRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            background: "#0d1117",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            lineHeight: 1.6,
            color: "#e6edf3",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {loading ? (
            <span style={{ color: "#8b949e" }}>Loading...</span>
          ) : (
            logs
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
