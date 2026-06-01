import TablePagination from "@/components/TablePagination";
import { useCallback, useState } from "react";
import {
  Container as ContainerIcon,
  ExternalLink,
  Eye,
  FolderOpen,
  Loader2,
  MoreVertical,
  Play,
  RotateCcw,
  RefreshCw,
  ScrollText,
  Square,
  Trash2,
} from "lucide-react";
import type { Container } from "@/lib/api";
import StatusBadge from "../StatusBadge";

function extractPublishedPort(portMapping: string): string | null {
  const normalized = portMapping.trim();
  if (!normalized) return null;

  const publishedSegment = normalized.includes("->")
    ? normalized.split("->")[0]?.trim()
    : normalized;

  if (!publishedSegment) return null;

  const match =
    publishedSegment.match(/:(\d+)$/) ?? publishedSegment.match(/^(\d+)$/);
  return match?.[1] ?? null;
}

function getContainerWebUiUrl(container: Container): string | null {
  const serverIp = container.server?.ip?.trim();
  if (!serverIp || !container.ports?.length) return null;

  const publishedPort = container.ports
    .map(extractPublishedPort)
    .find((port): port is string => Boolean(port));

  return publishedPort ? `http://${serverIp}:${publishedPort}` : null;
}

interface ContainersTableProps {
  loading: boolean;
  items: Container[];
  paginatedItems: Container[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  acting: Record<string, boolean>;
  openMenuId: string | null;
  onPageChange: (page: number) => void;
  onAction: (
    id: string,
    action: "start" | "stop" | "restart" | "delete",
  ) => void;
  onOpenDetails: (container: Container) => void;
  onOpenLogs: (container: Container) => void;
  onOpenFileManager: (container: Container) => void;
  onRebuild: (container: Container) => void;
  onMenuToggle: (containerId: string) => void;
  onMenuClose: () => void;
}

export default function ContainersTable({
  loading,
  items,
  paginatedItems,
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  acting,
  openMenuId,
  onPageChange,
  onAction,
  onOpenDetails,
  onOpenLogs,
  onOpenFileManager,
  onRebuild,
  onMenuToggle,
  onMenuClose,
}: ContainersTableProps) {
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const handleMenuToggle = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, containerId: string) => {
      event.stopPropagation();

      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 164;
      const menuHeight = 112;
      const nextLeft = Math.min(
        window.innerWidth - menuWidth - 12,
        Math.max(12, rect.right - menuWidth + rect.width),
      );
      const nextTop = Math.min(
        window.innerHeight - menuHeight - 12,
        rect.bottom + 6,
      );

      setMenuPosition({ top: Math.max(12, nextTop), left: nextLeft });
      onMenuToggle(containerId);
    },
    [onMenuToggle],
  );

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {loading ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "var(--accent)", margin: "0 auto 12px" }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Loading containers...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <ContainerIcon
            size={36}
            style={{
              color: "var(--text-muted)",
              margin: "0 auto 12px",
              opacity: 0.4,
            }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No containers found.
          </p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Container</th>
                  <th>Server</th>
                  <th>Status</th>
                  <th>Ports</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((container) => (
                  <tr key={container.id}>
                    {(() => {
                      const webUiUrl = getContainerWebUiUrl(container);
                      const canRebuild =
                        container.sourceType === "APP_INSTALLER" ||
                        container.sourceType === "GIT_CLONE" ||
                        container.sourceType === "GIT_PROVIDER";
                      const rebuildDisabled =
                        !canRebuild || acting[container.id + "rebuild"];
                      const rebuildTitle = !canRebuild
                        ? "Rebuild hanya tersedia untuk container App Installer atau Git/Repo"
                        : "Rebuild container";

                      return (
                        <>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  background: "var(--bg-input)",
                                  border: "1px solid var(--border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <ContainerIcon
                                  size={14}
                                  style={{ color: "#3b82f6" }}
                                />
                              </div>
                              <div>
                                <p
                                  style={{
                                    color: "var(--text-primary)",
                                    fontWeight: 600,
                                    fontSize: 13,
                                  }}
                                >
                                  {container.name}
                                </p>
                                <p
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: 11,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {container.image}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {container.server?.name ?? "—"}
                            {container.server?.ip ? (
                              <>
                                <br />
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--text-muted)",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {container.server.ip}
                                </span>
                              </>
                            ) : null}
                          </td>
                          <td>
                            <StatusBadge status={container.status} />
                          </td>
                          <td>
                            {container.ports && container.ports.length > 0 ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 4,
                                }}
                              >
                                {container.ports
                                  .slice(0, 3)
                                  .map((port, index) => (
                                    <span
                                      key={`${container.id}-${port}-${index}`}
                                      style={{
                                        background: "rgba(59,130,246,0.1)",
                                        color: "#3b82f6",
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {port}
                                    </span>
                                  ))}
                                {container.ports.length > 3 ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    +{container.ports.length - 3}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: 12,
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                justifyContent: "flex-end",
                              }}
                            >
                              {webUiUrl ? (
                                <a
                                  href={webUiUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost"
                                  style={{ padding: "5px 8px" }}
                                  title={`Open WebUI (${webUiUrl.replace("http://", "")})`}
                                  aria-label={`Open WebUI ${webUiUrl.replace("http://", "")}`}
                                >
                                  <ExternalLink size={11} />
                                </a>
                              ) : (
                                <button
                                  className="btn btn-ghost"
                                  style={{
                                    padding: "5px 8px",
                                    opacity: 0.5,
                                    cursor: "not-allowed",
                                  }}
                                  title="No published host port available"
                                  disabled
                                >
                                  <ExternalLink size={11} />
                                </button>
                              )}
                              {container.status === "STOPPED" ||
                              container.status === "ERROR" ? (
                                <button
                                  title="Start"
                                  onClick={() =>
                                    onAction(container.id, "start")
                                  }
                                  className="btn btn-ghost"
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: 11,
                                    color: "#10b981",
                                  }}
                                  disabled={acting[container.id + "start"]}
                                >
                                  {acting[container.id + "start"] ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Play size={12} />
                                  )}
                                </button>
                              ) : (
                                <button
                                  title="Stop"
                                  onClick={() => onAction(container.id, "stop")}
                                  className="btn btn-ghost"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  disabled={acting[container.id + "stop"]}
                                >
                                  {acting[container.id + "stop"] ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Square size={12} />
                                  )}
                                </button>
                              )}
                              <button
                                title="Restart"
                                onClick={() =>
                                  onAction(container.id, "restart")
                                }
                                className="btn btn-ghost"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                                disabled={acting[container.id + "restart"]}
                              >
                                {acting[container.id + "restart"] ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <RotateCcw size={12} />
                                )}
                              </button>
                              <button
                                title="Details"
                                onClick={() => onOpenDetails(container)}
                                className="btn btn-ghost"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                title="Logs"
                                onClick={() => {
                                  onMenuClose();
                                  onOpenLogs(container);
                                }}
                                className="btn btn-ghost"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                              >
                                <ScrollText size={12} />
                              </button>
                              <div
                                style={{ position: "relative" }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  title="More actions"
                                  onClick={(event) =>
                                    handleMenuToggle(event, container.id)
                                  }
                                  className="btn btn-ghost"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                >
                                  <MoreVertical size={12} />
                                </button>
                                {openMenuId === container.id && menuPosition ? (
                                  <div
                                    className="card"
                                    onClick={(event) => event.stopPropagation()}
                                    style={{
                                      position: "fixed",
                                      top: menuPosition.top,
                                      left: menuPosition.left,
                                      minWidth: 140,
                                      padding: 6,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 4,
                                      zIndex: 160,
                                      boxShadow:
                                        "0 18px 40px rgba(2, 6, 23, 0.42)",
                                    }}
                                  >
                                    <button
                                      onClick={() => {
                                        onMenuClose();
                                        onOpenFileManager(container);
                                      }}
                                      className="btn btn-ghost"
                                      style={{
                                        fontSize: 12,
                                        justifyContent: "flex-start",
                                      }}
                                      disabled={container.status !== "RUNNING"}
                                    >
                                      <FolderOpen size={12} />
                                      File Manager
                                    </button>

                                    <button
                                      onClick={() => {
                                        onMenuClose();
                                        onRebuild(container);
                                      }}
                                      className="btn btn-ghost"
                                      style={{
                                        fontSize: 12,
                                        justifyContent: "flex-start",
                                      }}
                                      title={rebuildTitle}
                                      disabled={rebuildDisabled}
                                    >
                                      {acting[container.id + "rebuild"] ? (
                                        <Loader2
                                          size={12}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <RefreshCw size={12} />
                                      )}
                                      Rebuild
                                    </button>

                                    <button
                                      onClick={() => {
                                        onMenuClose();
                                        onAction(container.id, "delete");
                                      }}
                                      className="btn btn-ghost"
                                      style={{
                                        fontSize: 12,
                                        justifyContent: "flex-start",
                                        color: "#ef4444",
                                      }}
                                      disabled={acting[container.id + "delete"]}
                                    >
                                      {acting[container.id + "delete"] ? (
                                        <Loader2
                                          size={12}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Trash2 size={12} />
                                      )}
                                      Remove
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startItem={startItem}
            endItem={endItem}
            itemLabel="containers"
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}
