"use client";

import TablePagination from "@/components/TablePagination";
import { useTablePagination } from "@/lib/use-table-pagination";
import { MoreHorizontal } from "lucide-react";
import type { RuntimeContainer } from "../../types/app-detail-types";
import PanelShell from "./PanelShell";

interface RuntimeContainersPanelProps {
  containers: RuntimeContainer[];
}

export default function RuntimeContainersPanel({
  containers,
}: RuntimeContainersPanelProps) {
  const pagination = useTablePagination({
    items: containers,
    resetKey: containers.map((container) => container.name).join("|"),
  });

  return (
    <PanelShell title={`Containers (${containers.length})`}>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Image</th>
              <th>Status</th>
              <th>CPU</th>
              <th>Memory</th>
              <th>Uptime</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((container) => (
              <tr key={container.name}>
                <td style={{ fontFamily: "var(--font--code)", fontSize: 11 }}>
                  {container.name}
                </td>
                <td style={{ fontFamily: "var(--font--code)", fontSize: 11 }}>
                  {container.image}
                </td>
                <td>
                  <span
                    style={{
                      color: "var(--accent-green)",
                      fontSize: 11,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent-green)",
                      }}
                    />
                    {container.status}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {container.cpu}
                    <span
                      style={{
                        width: 34,
                        height: 4,
                        borderRadius: 999,
                        background: "var(--accent-green-glow)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: "58%",
                          height: "100%",
                          background: "var(--accent-green)",
                        }}
                      />
                    </span>
                  </span>
                </td>
                <td>{container.memory}</td>
                <td>{container.uptime}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    aria-label={`More actions for ${container.name}`}
                    style={{ padding: "4px 7px" }}
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startItem={pagination.startItem}
        endItem={pagination.endItem}
        itemLabel="containers"
        onPageChange={pagination.setCurrentPage}
      />
    </PanelShell>
  );
}
