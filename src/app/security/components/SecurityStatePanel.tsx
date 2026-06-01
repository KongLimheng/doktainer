interface SecurityStatePanelProps {
  message: string;
}

export default function SecurityStatePanel({
  message,
}: SecurityStatePanelProps) {
  return (
    <div
      className="card"
      style={{
        padding: 42,
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}
