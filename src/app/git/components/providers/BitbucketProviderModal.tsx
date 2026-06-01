import { AlertTriangle, ExternalLink } from "lucide-react";
import { FieldLabel } from "@/app/settings/components/SettingsPrimitives";
import {
  BITBUCKET_SCOPES,
  type GitProviderModalBaseProps,
  getProviderMeta,
} from "./git-provider-shared";

export default function BitbucketProviderModal({
  draft,
  setupUrl,
  updateDraft,
}: GitProviderModalBaseProps) {
  return (
    <>
      <section
        style={{
          display: "grid",
          gap: 14,
          padding: 20,
          borderRadius: 16,
          border: `1px solid ${getProviderMeta(draft.provider).accentBorder}`,
          background: "var(--bg-input)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(249,115,22,0.24)",
            background: "rgba(249,115,22,0.14)",
            color: "rgb(250, 143, 28)",
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            Bitbucket App Passwords are deprecated for new providers. Use an API
            Token instead. Existing providers with App Passwords will continue
            to work until 9th June 2026.
          </div>
        </div>

        <a
          href={setupUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-primary)",
            textDecoration: "none",
            width: "fit-content",
          }}
        >
          Manage tokens in Bitbucket settings <ExternalLink size={13} />
        </a>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 8,
            }}
          >
            Select the following scopes:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BITBUCKET_SCOPES.map((scope) => (
              <span
                key={scope}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(59,130,246,0.2)",
                  background: "rgba(59,130,246,0.08)",
                  fontSize: 11,
                  color: "var(--text-primary)",
                }}
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Name</FieldLabel>
          <input
            className="input"
            value={draft.name}
            onChange={(event) => updateDraft("name", event.target.value)}
            placeholder="Your Bitbucket Provider, eg: my-personal-account"
          />
        </div>

        <div>
          <FieldLabel>Bitbucket Username</FieldLabel>
          <input
            className="input"
            value={draft.accountUsername}
            onChange={(event) =>
              updateDraft("accountUsername", event.target.value)
            }
            placeholder="Your Bitbucket username"
          />
        </div>

        <div>
          <FieldLabel>Bitbucket Email</FieldLabel>
          <input
            className="input"
            value={draft.accountEmail}
            onChange={(event) =>
              updateDraft("accountEmail", event.target.value)
            }
            placeholder="Your Bitbucket email"
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>API Token</FieldLabel>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={draft.clientSecret}
            onChange={(event) => {
              updateDraft("clientSecret", event.target.value);
              if (event.target.value.trim()) {
                updateDraft("hasClientSecret", true);
              }
            }}
            placeholder={
              draft.hasClientSecret
                ? "Token configured"
                : "Paste your Bitbucket API token"
            }
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <FieldLabel>Workspace Name (Optional)</FieldLabel>
          <input
            className="input"
            value={draft.namespace}
            onChange={(event) => updateDraft("namespace", event.target.value)}
            placeholder="For organization accounts"
          />
        </div>
      </section>
    </>
  );
}
