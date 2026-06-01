import { AddDomainFormState } from "./domain-types";

interface AddDomainDnsFieldsProps {
  form: AddDomainFormState;
  isContainerMode: boolean;
  selectedServerIp: string;
  onChange: (updates: Partial<AddDomainFormState>) => void;
}

const RECORD_TYPES: AddDomainFormState["type"][] = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
];

export default function AddDomainDnsFields({
  form,
  isContainerMode,
  selectedServerIp,
  onChange,
}: AddDomainDnsFieldsProps) {
  return (
    <>
      <div>
        <label
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            display: "block",
            marginBottom: 5,
          }}
        >
          Domain Name *
        </label>
        <input
          className="input"
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="example.com"
          required
          style={{ width: "100%" }}
        />
      </div>

      {isContainerMode ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 12,
            padding: 14,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "rgba(59,130,246,0.06)",
          }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              DNS Record Type
            </label>
            <input
              className="input"
              value="A"
              readOnly
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              DNS Target IP
            </label>
            <input
              className="input"
              value={selectedServerIp}
              readOnly
              placeholder="Select Server Target first"
              style={{ width: "100%" }}
            />
            <p
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}
            >
              Container Config automatically uses the selected server IP as the
              DNS target, then forwards traffic to the chosen container and port
              through a reverse proxy.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr",
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              Record Type
            </label>
            <select
              className="input"
              value={form.type}
              onChange={(event) =>
                onChange({
                  type: event.target.value as AddDomainFormState["type"],
                })
              }
              style={{ width: "100%" }}
            >
              {RECORD_TYPES.map((recordType) => (
                <option key={recordType}>{recordType}</option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              {form.type === "CNAME"
                ? "Target Domain"
                : form.type === "MX"
                  ? "Mail Server"
                  : form.type === "TXT"
                    ? "TXT Value"
                    : "IP Address"}{" "}
              *
            </label>
            <input
              className="input"
              value={form.value}
              onChange={(event) => onChange({ value: event.target.value })}
              placeholder={
                form.type === "A"
                  ? "192.168.1.10"
                  : form.type === "CNAME"
                    ? "target.example.com"
                    : ""
              }
              required
              style={{ width: "100%" }}
            />
            {(form.type === "A" || form.type === "AAAA") && (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 6,
                }}
              >
                DNS records only accept IP addresses. Use Container Config if
                you want this domain to forward traffic into a container port.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
