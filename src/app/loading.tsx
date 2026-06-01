import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg-main)",
        color: "var(--text-secondary)",
      }}
    >
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          fontSize: 13,
        }}
      >
        <Loader2 size={16} className="animate-spin" />
        Loading page...
      </div>
    </div>
  );
}
