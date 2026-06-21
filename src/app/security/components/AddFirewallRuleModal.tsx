import { Loader2, Plus, X } from "lucide-react";
import type { RuleFormState } from "./security-types";

interface AddFirewallRuleModalProps {
  ruleForm: RuleFormState;
  actionKey: string | null;
  onClose: () => void;
  onRuleFormChange: (nextState: RuleFormState) => void;
  onSubmit: () => void | Promise<void>;
}

export default function AddFirewallRuleModal({
  ruleForm,
  actionKey,
  onClose,
  onRuleFormChange,
  onSubmit,
}: AddFirewallRuleModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-shell"
        style={{ maxWidth: 400 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close add firewall rule modal"
        >
          <X size={22} />
        </button>
      <div
        className="modal"
        style={{ maxWidth: 400 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 20,
            paddingRight: 36,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Add Firewall Rule
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 5,
                display: "block",
                fontWeight: 500,
              }}
            >
              Port / Protocol
            </label>
            <input
              className="input"
              placeholder="e.g. 8080/tcp"
              value={ruleForm.rule}
              onChange={(event) =>
                onRuleFormChange({ ...ruleForm, rule: event.target.value })
              }
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 5,
                display: "block",
                fontWeight: 500,
              }}
            >
              Action
            </label>
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--bg-input)",
                borderRadius: 8,
                padding: 3,
              }}
            >
              {[
                { label: "ALLOW", value: "allow" as const },
                { label: "DENY", value: "deny" as const },
              ].map((action) => (
                <button
                  type="button"
                  key={action.value}
                  onClick={() =>
                    onRuleFormChange({ ...ruleForm, action: action.value })
                  }
                  style={{
                    flex: 1,
                    padding: "5px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background:
                      ruleForm.action === action.value
                        ? "rgba(16,185,129,0.15)"
                        : "transparent",
                    color:
                      ruleForm.action === action.value
                        ? "#10b981"
                        : "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 5,
                display: "block",
                fontWeight: 500,
              }}
            >
              From (IP / Subnet)
            </label>
            <input
              className="input"
              placeholder="Anywhere / 192.168.1.0/24"
              value={ruleForm.from}
              onChange={(event) =>
                onRuleFormChange({ ...ruleForm, from: event.target.value })
              }
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => void onSubmit()}
              disabled={actionKey === "add-rule" || !ruleForm.rule.trim()}
            >
              {actionKey === "add-rule" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              Add Rule
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
