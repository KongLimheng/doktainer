"use client";

import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { SslCert, SslRenewOperation } from "@/lib/api";
import { formatDate, getDaysLeft } from "@/app/ssl/components/ssl-utils";

interface SSLCertificatesGridProps {
  certs: SslCert[];
  busyId: string | null;
  renewBusy: boolean;
  renewOperations?: Record<string, SslRenewOperation>;
  onRenew: (id: string) => void | Promise<void>;
  onToggleAutoRenew: (id: string, nextValue: boolean) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export default function SSLCertificatesGrid({
  certs,
  busyId,
  renewBusy,
  renewOperations = {},
  onRenew,
  onToggleAutoRenew,
  onDelete,
}: SSLCertificatesGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
        gap: 14,
      }}
    >
      {certs.map((cert) => {
        const daysLeft = getDaysLeft(cert.expiresAt);
        const isHealthy = cert.status === "VALID";
        const domainName = cert.domain?.name ?? "Unknown domain";
        const serverName = cert.domain?.server?.name ?? "Unassigned";
        const renewOperation = renewOperations[cert.id];

        return (
          <div key={cert.id} className="card" style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: isHealthy
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(245,158,11,0.1)",
                    border: `1px solid ${isHealthy ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock
                    size={15}
                    style={{ color: isHealthy ? "#10b981" : "#f59e0b" }}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {domainName}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {cert.issuer}
                  </p>
                </div>
              </div>
              {isHealthy ? (
                <CheckCircle size={16} style={{ color: "#10b981" }} />
              ) : (
                <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {[
                ["Issued", formatDate(cert.issuedAt)],
                ["Expires", formatDate(cert.expiresAt)],
                ["Server", serverName],
                ["Status", cert.status],
              ].map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {key}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "JetBrains Mono, monospace",
                      color: "var(--text-secondary)",
                      textAlign: "right",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Days left
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      daysLeft !== null && daysLeft < 30
                        ? "#f59e0b"
                        : "#10b981",
                  }}
                >
                  {daysLeft === null ? "-" : `${daysLeft} days`}
                </span>
              </div>
            </div>

            <div className="progress-bar" style={{ marginBottom: 14 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(((daysLeft ?? 0) / 365) * 100, 100)}%`,
                  background:
                    daysLeft !== null && daysLeft < 30 ? "#f59e0b" : "#10b981",
                }}
              />
            </div>

            {renewOperation ? (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginBottom: 14,
                  background: "rgba(59,130,246,0.06)",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: 0,
                    marginBottom: 3,
                  }}
                >
                  {renewOperation.stage.replace(/_/g, " ")}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {renewOperation.message ?? "Renewal is still running"}
                </p>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: 11, padding: "5px" }}
                onClick={() => void onRenew(cert.id)}
                disabled={renewBusy}
              >
                {busyId === cert.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}{" "}
                {busyId === cert.id ? "Renewing..." : "Renew"}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 11, padding: "5px" }}
                onClick={() => void onToggleAutoRenew(cert.id, !cert.autoRenew)}
                disabled={busyId === cert.id}
              >
                {cert.autoRenew ? "Disable Auto" : "Enable Auto"}
              </button>
              <button
                className="btn btn-danger"
                style={{ padding: "5px 8px" }}
                onClick={() => void onDelete(cert.id)}
                disabled={busyId === cert.id}
              >
                {busyId === cert.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Trash2 size={11} />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
