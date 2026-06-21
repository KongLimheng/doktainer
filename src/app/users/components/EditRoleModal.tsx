"use client";

import { AlertCircle, Edit3, Loader2, X } from "lucide-react";
import { useState } from "react";
import type { UserRecord, UserRole } from "@/lib/api";
import { manageableRoles } from "@/app/users/components/user-role-config";

interface EditRoleModalProps {
  user: UserRecord;
  onClose: () => void;
  onSubmit: (role: Exclude<UserRole, "SUPER_ADMIN">) => Promise<void>;
  submitting: boolean;
  error: string;
}

export default function EditRoleModal({
  user,
  onClose,
  onSubmit,
  submitting,
  error,
}: EditRoleModalProps) {
  const [role, setRole] = useState<Exclude<UserRole, "SUPER_ADMIN">>(
    user.role as Exclude<UserRole, "SUPER_ADMIN">,
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-shell"
        style={{ maxWidth: 420 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close edit role modal"
        >
          <X size={22} />
        </button>
      <div
        className="modal"
        style={{ maxWidth: 420 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 20,
            paddingRight: 36,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Edit Role
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {user.email}
            </p>
          </div>
        </div>

        {error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444",
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {manageableRoles.map((item) => {
            const Icon = item.icon;
            return (
              <label
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--bg-input)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${role === item.id ? item.color : "var(--border)"}`,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  checked={role === item.id}
                  name="role"
                  onChange={() =>
                    setRole(item.id as Exclude<UserRole, "SUPER_ADMIN">)
                  }
                  style={{ accentColor: item.color }}
                />
                <Icon size={13} style={{ color: item.color }} />
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.label}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {item.desc}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => void onSubmit(role)}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Edit3 size={12} />
            )}
            Save Role
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
