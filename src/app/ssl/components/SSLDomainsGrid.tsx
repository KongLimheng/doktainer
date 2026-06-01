"use client";

import { Loader2, Plus } from "lucide-react";
import { Domain } from "@/lib/api";

interface SSLDomainsGridProps {
  domains: Domain[];
  issuingDomainId: string | null;
  syncing: boolean;
  onQuickIssue: (domain: Domain) => void | Promise<void>;
}

export default function SSLDomainsGrid({
  domains,
  issuingDomainId,
  syncing,
  onQuickIssue,
}: SSLDomainsGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
        gap: 12,
      }}
    >
      {domains.map((domain) => {
        const isIssuing = issuingDomainId === domain.id;

        return (
          <div
            key={domain.id}
            className="card"
            style={{
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {domain.name}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  {domain.server?.name ?? "Unassigned server"}
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "#f97316",
                  background: "rgba(249,115,22,0.12)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  borderRadius: 999,
                  padding: "4px 8px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                SSL not installed
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {[
                ["Proxy", domain.proxy === "NONE" ? "No proxy" : domain.proxy],
                ["Target", domain.value],
                ["Auto renew", domain.autoRenew ? "Enabled" : "Disabled"],
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
                      color: "var(--text-secondary)",
                      textAlign: "right",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 12 }}
                disabled={isIssuing || syncing || !domain.serverId}
                onClick={() => void onQuickIssue(domain)}
                title={
                  domain.serverId
                    ? "Generate SSL certificate"
                    : "Assign this domain to a server before issuing SSL"
                }
              >
                {isIssuing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                Generate SSL
              </button>
            </div>

            {!domain.serverId ? (
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                This domain needs a server assignment before certificate
                issuance.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
