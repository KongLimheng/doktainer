interface PanelShellProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export default function PanelShell({ title, children, action }: PanelShellProps) {
  return (
    <section
      className="card"
      style={{
        padding: 14,
        background: "var(--bg-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
