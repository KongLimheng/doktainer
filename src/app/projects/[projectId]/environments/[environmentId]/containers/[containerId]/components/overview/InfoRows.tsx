interface InfoRowsProps {
  rows: Array<{
    label: string;
    value: React.ReactNode;
  }>;
}

export default function InfoRows({ rows }: InfoRowsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(88px, 0.55fr) minmax(0, 1fr)",
            gap: 12,
            alignItems: "center",
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
          <span
            style={{
              minWidth: 0,
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
  );
}
