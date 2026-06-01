"use client";

import {
  Archive,
  CheckCircle2,
  Database,
  FolderOpen,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import type { StorageTabData } from "../../types/app-detail-types";
import PanelShell from "../overview/PanelShell";

interface StorageTabPanelProps {
  storage: StorageTabData;
}

const summaryToneColor: Record<
  StorageTabData["summaries"][number]["tone"],
  string
> = {
  blue: "var(--accent-blue)",
  green: "var(--accent-green)",
  purple: "var(--accent-purple)",
  amber: "var(--accent-yellow)",
  cyan: "var(--accent-cyan)",
};

const statusClass: Record<
  | StorageTabData["mounts"][number]["status"]
  | StorageTabData["backups"][number]["status"]
  | StorageTabData["paths"][number]["status"],
  string
> = {
  Mounted: "badge-online",
  Detached: "badge-danger",
  Pending: "badge-warning",
  Completed: "badge-online",
  Scheduled: "badge-warning",
  Failed: "badge-danger",
  Available: "badge-online",
  Missing: "badge-danger",
  Readonly: "badge-warning",
};

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        minHeight: 172,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        textAlign: "center",
        color: "var(--text-muted)",
        border: "1px dashed var(--border)",
        borderRadius: 7,
        background: "var(--bg-input)",
        padding: 18,
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent-blue)",
          background: "rgba(59,130,246,0.1)",
        }}
      >
        {icon}
      </span>
      <div>
        <p
          style={{
            margin: 0,
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {title}
        </p>
        <p
          style={{
            marginTop: 5,
            maxWidth: 420,
            color: "var(--text-muted)",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function UsageBar({ value }: { value: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: 7,
        borderRadius: 999,
        overflow: "hidden",
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          display: "block",
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          background:
            value > 75
              ? "var(--text-danger)"
              : value > 55
                ? "var(--accent-yellow)"
                : "var(--accent-blue)",
        }}
      />
    </div>
  );
}

export default function StorageTabPanel({ storage }: StorageTabPanelProps) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
          gap: 12,
        }}
      >
        {storage.summaries.map((summary) => (
          <div
            key={summary.label}
            className="card"
            style={{
              padding: 14,
              background: "var(--bg-card)",
              minHeight: 112,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
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
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {summary.label}
              </p>
              <HardDrive
                size={16}
                style={{ color: summaryToneColor[summary.tone] }}
              />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-primary)",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {summary.value}
              </p>
              <p
                style={{
                  marginTop: 5,
                  color: "var(--text-muted)",
                  fontSize: 11,
                }}
              >
                {summary.subvalue}
              </p>
            </div>
          </div>
        ))}
      </div>

      <PanelShell title="Volume Mounts">
        {storage.mounts.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Target</th>
                  <th>Type</th>
                  <th>Access</th>
                  <th>Usage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {storage.mounts.map((mount) => (
                  <tr key={mount.id}>
                    <td>
                      <Database size={13} />
                      {mount.name}
                    </td>
                    <td style={{ fontFamily: "var(--font--code)" }}>
                      {mount.source}
                    </td>
                    <td style={{ fontFamily: "var(--font--code)" }}>
                      {mount.target}
                    </td>
                    <td>{mount.type}</td>
                    <td>{mount.access}</td>
                    <td style={{ minWidth: 150 }}>
                      <div style={{ display: "grid", gap: 5 }}>
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: 11,
                          }}
                        >
                          {mount.size}
                        </span>
                        <UsageBar value={mount.usage} />
                      </div>
                    </td>
                    <td>
                      <span
                        className={`ui-badge ${statusClass[mount.status]}`}
                      >
                        {mount.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<HardDrive size={21} />}
            title="No volume mounts detected"
            description="Docker inspect did not return bind mounts, volumes, or tmpfs mounts for this container."
          />
        )}
      </PanelShell>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(min(620px, 100%), 1.25fr) minmax(min(360px, 100%), 0.75fr)",
          gap: 12,
          alignItems: "start",
        }}
      >
        <PanelShell title="Docker Volumes">
          {storage.volumes.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {storage.volumes.map((volume) => (
              <div
                key={volume.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--bg-input)",
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--text-primary)",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {volume.name}
                    </p>
                    <p
                      style={{
                        marginTop: 4,
                        color: "var(--text-muted)",
                        fontSize: 11,
                        fontFamily: "var(--font--code)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {volume.mountpoint}
                    </p>
                  </div>
                  <span className="ui-badge badge-online">{volume.driver}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  {volume.labels.map((label) => (
                    <span key={label} className="ui-badge">
                      {label}
                    </span>
                  ))}
                </div>
                <p
                  style={{
                    marginTop: 10,
                    color: "var(--text-muted)",
                    fontSize: 11,
                  }}
                >
                  Scope {volume.scope} - Created {volume.createdAt}
                </p>
              </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Database size={21} />}
              title="No Docker volumes"
              description="This container does not expose Docker named volumes in its current inspect data."
            />
          )}
        </PanelShell>

        <PanelShell title="Known Paths">
          {storage.paths.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {storage.paths.map((path) => (
              <div
                key={path.path}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0, 1fr)",
                  gap: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--bg-input)",
                  padding: 11,
                }}
              >
                <FolderOpen
                  size={16}
                  style={{
                    color:
                      path.status === "Available"
                        ? "var(--accent-green)"
                        : path.status === "Missing"
                          ? "var(--text-danger)"
                          : "var(--accent-yellow)",
                    marginTop: 1,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "var(--text-primary)",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {path.label}
                    </p>
                    <span className={`ui-badge ${statusClass[path.status]}`}>
                      {path.status}
                    </span>
                  </div>
                  <p
                    style={{
                      marginTop: 5,
                      color: "var(--text-muted)",
                      fontSize: 11,
                      fontFamily: "var(--font--code)",
                    }}
                  >
                    {path.path}
                  </p>
                  <p
                    style={{
                      marginTop: 5,
                      color: "var(--text-muted)",
                      fontSize: 11,
                      lineHeight: 1.45,
                    }}
                  >
                    {path.purpose}
                  </p>
                </div>
              </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderOpen size={21} />}
              title="No mounted paths"
              description="Mounted application paths will appear here when Docker reports storage mappings for this container."
            />
          )}
        </PanelShell>
      </div>

      <PanelShell title="Backup Policy">
        {storage.backups.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
              gap: 10,
            }}
          >
            {storage.backups.map((backup) => (
            <div
              key={backup.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 7,
                background: "var(--bg-input)",
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-primary)",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {backup.name}
                  </p>
                  <p
                    style={{
                      marginTop: 5,
                      color: "var(--text-muted)",
                      fontSize: 11,
                      fontFamily: "var(--font--code)",
                    }}
                  >
                    {backup.target}
                  </p>
                </div>
                <span className={`ui-badge ${statusClass[backup.status]}`}>
                  {backup.status === "Completed" ? (
                    <CheckCircle2 size={12} />
                  ) : backup.status === "Scheduled" ? (
                    <Archive size={12} />
                  ) : (
                    <ShieldCheck size={12} />
                  )}
                  {backup.status}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {[
                  { label: "Size", value: backup.size },
                  { label: "Last Run", value: backup.lastRun },
                  { label: "Retention", value: backup.retention },
                ].map((item) => (
                  <div key={item.label} style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--text-muted)",
                        fontSize: 10,
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        marginTop: 3,
                        color: "var(--text-primary)",
                        fontSize: 12,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Archive size={21} />}
            title="No backup policy linked"
            description="Backup records are not linked to this app/container yet. Existing backups remain managed from the Backups page."
          />
        )}
      </PanelShell>
    </section>
  );
}
