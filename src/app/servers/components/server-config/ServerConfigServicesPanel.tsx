"use client";

import { Loader2, RefreshCw } from "lucide-react";
import type { ServerConfigSnapshot } from "@/lib/api";
import {
  ServiceStatusBadge,
  UserBadge,
} from "@/app/servers/components/server-config/ServerConfigPrimitives";
import { canRestartService } from "@/app/servers/components/server-config-utils";

interface ServerConfigServicesPanelProps {
  snapshot: ServerConfigSnapshot;
  snapshotLoadError?: string | null;
  isActionRunning: (actionKey: string) => boolean;
  getServiceActionKey: (serviceName: string) => string;
  onRequestServiceRestartConfirm: (serviceName: string) => void;
}

export default function ServerConfigServicesPanel({
  snapshot,
  snapshotLoadError,
  isActionRunning,
  getServiceActionKey,
  onRequestServiceRestartConfirm,
}: ServerConfigServicesPanelProps) {
  return (
    <div
      style={{ display: "grid", gap: 16 }}
      hidden={snapshotLoadError != null}
    >
      <div className="card" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>
              Service Snapshot
            </strong>
            <p
              style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 13 }}
            >
              Runtime status for common services detected on the server.
            </p>
          </div>
          <UserBadge
            label={`${snapshot.services.length} services`}
            tone="info"
          />
        </div>
      </div>
      {snapshot.services.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
            gap: 16,
          }}
        >
          {snapshot.services.map((service, index) => (
            <div
              key={`${service.name}-${service.active}-${service.enabled}-${index}`}
              className="card"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 16,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <strong
                    style={{
                      color: "var(--text-primary)",
                      fontSize: 14,
                      textTransform: "capitalize",
                    }}
                  >
                    {service.name}
                  </strong>
                  <p
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    {service.description ?? "No description available"}
                  </p>
                </div>
                {canRestartService(service.name) ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onRequestServiceRestartConfirm(service.name)}
                    disabled={isActionRunning(
                      getServiceActionKey(service.name),
                    )}
                    style={{
                      color: "#3b82f6",
                      border: "1px solid rgba(59,130,246,0.18)",
                      background: "rgba(59,130,246,0.08)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isActionRunning(getServiceActionKey(service.name)) ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                  </button>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ServiceStatusBadge state={service.active} />
                <ServiceStatusBadge state={service.enabled} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="card"
          style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}
        >
          {snapshotLoadError
            ? "Service inventory could not be loaded because the live server snapshot is unavailable."
            : "No supported services were detected from the current snapshot."}
        </div>
      )}
    </div>
  );
}
