"use client";

import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { Domain, sslCerts as sslApi } from "@/lib/api";

interface IssueCertificateModalProps {
  domains: Domain[];
  onClose: () => void;
  onAdded: () => void;
}

export default function IssueCertificateModal({
  domains,
  onClose,
  onAdded,
}: IssueCertificateModalProps) {
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [issuer, setIssuer] = useState("Let's Encrypt");
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sslApi.issue({ domainId, issuer, autoRenew });
      onAdded();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to issue certificate",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-shell" style={{ maxWidth: 500 }}>
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close issue certificate modal"
        >
          <X size={22} />
        </button>
      <div
        className="modal animate-slide-in"
        style={{ width: "100%", maxWidth: 500, padding: 24 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 18,
            paddingRight: 36,
          }}
        >
          <div>
            <h3
              style={{
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              Issue Certificate
            </h3>
            <p
              style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}
            >
              Create a new SSL record from an existing domain.
            </p>
          </div>
        </div>

        {error ? (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        ) : null}

        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Domain *
            </label>
            <select
              className="input"
              value={domainId}
              onChange={(event) => setDomainId(event.target.value)}
              style={{ width: "100%" }}
              required
            >
              <option value="">Select domain</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Issuer
            </label>
            <input
              className="input"
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={() => setAutoRenew((current) => !current)}
            />
            Enable auto renewal
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                flex: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Issue Certificate
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
