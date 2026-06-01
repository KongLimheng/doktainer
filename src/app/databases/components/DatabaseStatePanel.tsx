import { Database, Loader2, Plus } from "lucide-react";

interface DatabaseStatePanelProps {
  loading: boolean;
  isEmpty: boolean;
  searchActive: boolean;
  onAdd: () => void;
}

export default function DatabaseStatePanel({
  loading,
  isEmpty,
  searchActive,
  onAdd,
}: DatabaseStatePanelProps) {
  if (loading) {
    return (
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: 48, textAlign: "center" }}>
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "var(--accent)", margin: "0 auto 12px" }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Loading Databases...
          </p>
        </div>
      </div>
    );
  }

  if (!isEmpty) {
    return null;
  }

  return (
    <div
      className="card"
      style={{
        padding: 48,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}
    >
      <Database
        size={36}
        style={{
          color: "var(--text-muted)",
          margin: "0 auto 12px",
          opacity: 0.4,
        }}
      />
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        {searchActive
          ? "No database containers match your search"
          : "No database containers detected on connected Docker hosts"}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 16, fontSize: 12 }}
        onClick={onAdd}
      >
        <Plus size={12} /> Deploy First Database
      </button>
    </div>
  );
}
