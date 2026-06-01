import { DomainConfigMode } from "./domain-types";

interface AddDomainModeSelectorProps {
  configMode: DomainConfigMode;
  onChange: (mode: DomainConfigMode) => void;
}

const CONFIG_OPTIONS: Array<{
  key: DomainConfigMode;
  label: string;
  desc: string;
}> = [
  {
    key: "MANUAL",
    label: "Manual Config",
    desc: "Fill in DNS records manually",
  },
  {
    key: "CONTAINER",
    label: "Container Config",
    desc: "Point domain to container via reverse proxy",
  },
];

export default function AddDomainModeSelector({
  configMode,
  onChange,
}: AddDomainModeSelectorProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        padding: 4,
        borderRadius: 10,
        background: "rgba(148,163,184,0.12)",
      }}
    >
      {CONFIG_OPTIONS.map((option) => {
        const active = configMode === option.key;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 8,
              border: active
                ? "1px solid var(--accent)"
                : "1px solid transparent",
              background: active ? "rgba(59,130,246,0.12)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700 }}>{option.label}</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>{option.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
