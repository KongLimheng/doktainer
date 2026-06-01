import PanelShell from "../overview/PanelShell";

interface RuntimeKeyValuePanelProps {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

export default function RuntimeKeyValuePanel({
  title,
  rows,
}: RuntimeKeyValuePanelProps) {
  return (
    <PanelShell title={title}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(110px, 0.45fr) minmax(0, 1fr)",
              gap: 12,
              alignItems: "center",
              fontSize: 12,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
            <span
              style={{
                minWidth: 0,
                color: "var(--text-primary)",
                fontFamily: "var(--font--code)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "right",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
