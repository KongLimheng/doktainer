"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, Database, HardDrive, Loader2, Network, X } from "lucide-react";
import {
  containers as containersApi,
  type Container,
  type ContainerDetails,
} from "@/lib/api";
import ContainerStatCard from "../ContainerStatCard";
import StatusBadge from "../StatusBadge";
import { formatBytes } from "../../utils/container-utils";

interface ContainerDetailsModalProps {
  container: Container;
  onClose: () => void;
}

type DetailTab = "overview" | "logs" | "inspect" | "processes";

export default function ContainerDetailsModal({
  container,
  onClose,
}: ContainerDetailsModalProps) {
  const [detail, setDetail] = useState<ContainerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const contentViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containersApi
      .details(container.id, 300)
      .then((response) => setDetail(response.data ?? null))
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load container details",
        );
      })
      .finally(() => setLoading(false));
  }, [container.id]);

  useEffect(() => {
    if (loading || activeTab !== "logs") return;
    const viewport = contentViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [activeTab, detail?.logs, loading]);

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "logs", label: "Logs" },
    { id: "inspect", label: "Inspect" },
    { id: "processes", label: "Processes" },
  ];

  return (
    <div className="modal-overlay">
      <div
        className="modal animate-slide-in"
        style={{
          width: "100%",
          maxWidth: 1080,
          maxHeight: "90vh",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {container.name}
              </h3>
              <StatusBadge
                status={detail?.container.status ?? container.status}
              />
            </div>
            <p
              style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}
            >
              {container.image}
              {detail?.server
                ? ` • ${detail.server.name} (${detail.server.ip})`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "14px 22px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-ghost"
              style={{
                fontSize: 12,
                border:
                  activeTab === tab.id
                    ? "1px solid rgba(59,130,246,0.35)"
                    : "1px solid transparent",
                background:
                  activeTab === tab.id ? "rgba(59,130,246,0.12)" : undefined,
                color: activeTab === tab.id ? "#3b82f6" : undefined,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          ref={contentViewportRef}
          style={{ flex: 1, overflow: "auto", padding: 22 }}
        >
          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <Loader2
                size={28}
                className="animate-spin"
                style={{ color: "var(--accent)", margin: "0 auto 12px" }}
              />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Loading container details...
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10,
                padding: 16,
                color: "#ef4444",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : detail ? (
            <>
              {activeTab === "overview" ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
                      gap: 12,
                    }}
                  >
                    <ContainerStatCard
                      icon={<Cpu size={15} />}
                      label="CPU Usage"
                      value={`${detail.stats.cpuPercent.toFixed(2)}%`}
                      subvalue={`Container processes: ${detail.stats.pids}`}
                    />
                    <ContainerStatCard
                      icon={<HardDrive size={15} />}
                      label="Memory Usage"
                      value={detail.stats.memory.used || "—"}
                      subvalue={
                        detail.stats.memory.limit
                          ? `of ${detail.stats.memory.limit} • ${detail.stats.memoryPercent.toFixed(2)}%`
                          : undefined
                      }
                    />
                    <ContainerStatCard
                      icon={<Network size={15} />}
                      label="Network I/O"
                      value={detail.stats.network.raw || "—"}
                      subvalue={
                        detail.stats.network.totalBytes !== null &&
                        detail.stats.network.totalBytes !== undefined
                          ? `Aggregate ${formatBytes(detail.stats.network.totalBytes)}`
                          : undefined
                      }
                    />
                    <ContainerStatCard
                      icon={<Database size={15} />}
                      label="Block I/O"
                      value={detail.stats.io.raw || "—"}
                      subvalue={
                        detail.stats.io.totalBytes !== null &&
                        detail.stats.io.totalBytes !== undefined
                          ? `Aggregate ${formatBytes(detail.stats.io.totalBytes)}`
                          : undefined
                      }
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
                      gap: 16,
                    }}
                  >
                    <div
                      className="card"
                      style={{ padding: 16, background: "var(--bg-input)" }}
                    >
                      <h4
                        style={{
                          color: "var(--text-primary)",
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        Memory
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Used</span>
                          <span>{detail.stats.memory.used || "—"}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Limit</span>
                          <span>{detail.stats.memory.limit || "—"}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Usage Percent</span>
                          <span>{detail.stats.memoryPercent.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="card"
                      style={{ padding: 16, background: "var(--bg-input)" }}
                    >
                      <h4
                        style={{
                          color: "var(--text-primary)",
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        Runtime Identity
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Docker ID</span>
                          <span style={{ fontFamily: "monospace" }}>
                            {detail.container.dockerId || "—"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Server</span>
                          <span>{detail.server.name}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>IP</span>
                          <span style={{ fontFamily: "monospace" }}>
                            {detail.server.ip}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Processes</span>
                          <span>{detail.processes.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
                      gap: 16,
                    }}
                  >
                    <div
                      className="card"
                      style={{ padding: 16, background: "var(--bg-input)" }}
                    >
                      <h4
                        style={{
                          color: "var(--text-primary)",
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        Network Usage
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Received</span>
                          <span>{detail.stats.network.read || "—"}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Transmitted</span>
                          <span>{detail.stats.network.write || "—"}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Aggregate</span>
                          <span>
                            {formatBytes(detail.stats.network.totalBytes)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="card"
                      style={{ padding: 16, background: "var(--bg-input)" }}
                    >
                      <h4
                        style={{
                          color: "var(--text-primary)",
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        Block I/O
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Read</span>
                          <span>{detail.stats.io.read || "—"}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Write</span>
                          <span>{detail.stats.io.write || "—"}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>Aggregate</span>
                          <span>{formatBytes(detail.stats.io.totalBytes)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "logs" ? (
                <div
                  style={{
                    background: "#0d1117",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                    padding: 16,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "#e6edf3",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    minHeight: 420,
                  }}
                >
                  {detail.logs || "(no output)"}
                </div>
              ) : null}

              {activeTab === "inspect" ? (
                <div
                  style={{
                    background: "#0d1117",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                    padding: 16,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "#e6edf3",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    minHeight: 420,
                  }}
                >
                  {JSON.stringify(detail.inspect, null, 2)}
                </div>
              ) : null}

              {activeTab === "processes" ? (
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>PID</th>
                          <th>PPID</th>
                          <th>User</th>
                          <th>CPU</th>
                          <th>MEM</th>
                          <th>Elapsed</th>
                          <th>Command</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.processes.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                textAlign: "center",
                                color: "var(--text-muted)",
                                padding: 24,
                              }}
                            >
                              No process data available.
                            </td>
                          </tr>
                        ) : (
                          detail.processes.map((process, index) => (
                            <tr key={`${process.pid}-${index}`}>
                              <td style={{ fontFamily: "monospace" }}>
                                {process.pid}
                              </td>
                              <td style={{ fontFamily: "monospace" }}>
                                {process.ppid}
                              </td>
                              <td>{process.user}</td>
                              <td>{process.cpu}</td>
                              <td>{process.memory}</td>
                              <td>{process.elapsed}</td>
                              <td
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: 11,
                                }}
                              >
                                {process.command}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
