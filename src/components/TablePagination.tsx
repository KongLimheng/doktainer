"use client";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export default function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  startItem,
  endItem,
  itemLabel = "items",
  onPageChange,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div
      style={{
        padding: "10px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Showing {startItem}-{endItem} of {totalItems} {itemLabel}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: "5px 10px" }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Prev
        </button>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Page {currentPage} / {totalPages}
        </span>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: "5px 10px" }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
