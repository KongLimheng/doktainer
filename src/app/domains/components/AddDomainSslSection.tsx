import { AddDomainFormState } from "./domain-types";

interface AddDomainSslSectionProps {
  form: AddDomainFormState;
  certbotInstalled: boolean;
  sslSupported?: boolean;
  unsupportedMessage?: string;
  onToggle: (key: "sslEnabled" | "autoRenew") => void;
}

const SSL_OPTIONS = [
  {
    key: "sslEnabled",
    label: "Auto SSL (Let's Encrypt)",
    desc: "Generate free SSL certificate",
  },
  {
    key: "autoRenew",
    label: "Auto-Renew",
    desc: "Automatically renew before expiry",
  },
] as const;

export default function AddDomainSslSection({
  form,
  certbotInstalled,
  sslSupported = true,
  unsupportedMessage,
  onToggle,
}: AddDomainSslSectionProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        background: "var(--bg-input)",
        borderRadius: 8,
        border: "1px solid var(--border)",
      }}
    >
      {SSL_OPTIONS.map(({ key, label, desc }) => (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {label}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{desc}</p>
          </div>
          <button
            type="button"
            onClick={() => onToggle(key)}
            disabled={
              key === "sslEnabled"
                ? !sslSupported || !form.serverId || !certbotInstalled
                : !sslSupported || !form.sslEnabled || !certbotInstalled
            }
            style={{
              width: 38,
              height: 21,
              borderRadius: 11,
              background: form[key] ? "#3b82f6" : "#334155",
              border: "none",
              position: "relative",
              cursor:
                key === "sslEnabled"
                  ? sslSupported && form.serverId && certbotInstalled
                    ? "pointer"
                    : "not-allowed"
                  : sslSupported && form.sslEnabled && certbotInstalled
                    ? "pointer"
                    : "not-allowed",
              flexShrink: 0,
              opacity:
                key === "sslEnabled"
                  ? sslSupported && form.serverId && certbotInstalled
                    ? 1
                    : 0.5
                  : sslSupported && form.sslEnabled && certbotInstalled
                    ? 1
                    : 0.5,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: form[key] ? "auto" : 2,
                right: form[key] ? 2 : "auto",
                width: 17,
                height: 17,
                borderRadius: "50%",
                background: "white",
              }}
            />
          </button>
        </div>
      ))}

      {!form.serverId && (
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Auto SSL is only available after a target server is selected.
        </p>
      )}
      {form.serverId && !sslSupported && unsupportedMessage && (
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {unsupportedMessage}
        </p>
      )}
      {form.serverId && !certbotInstalled && (
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Auto SSL is disabled because Certbot is not installed on the selected
          server.
        </p>
      )}
    </div>
  );
}
