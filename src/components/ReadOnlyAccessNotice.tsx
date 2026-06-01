interface ReadOnlyAccessNoticeProps {
  title?: string;
  message?: string;
}

export default function ReadOnlyAccessNotice({
  title = "Viewer Mode Enabled",
  message = "Your role is read-only. Buttons and forms that change data are disabled on this page.",
}: ReadOnlyAccessNoticeProps) {
  return (
    <div
      className="card"
      style={{
        padding: "12px 16px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#f59e0b",
        border: "1px solid rgba(245,158,11,0.28)",
        background: "rgba(245,158,11,0.08)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "currentColor",
          flexShrink: 0,
        }}
      />
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
