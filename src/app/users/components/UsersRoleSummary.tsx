import { roles } from "@/app/users/components/user-role-config";
import type { UserRole } from "@/lib/api";

interface UsersRoleSummaryProps {
  roleCounts: Record<UserRole, number>;
}

export default function UsersRoleSummary({
  roleCounts,
}: UsersRoleSummaryProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {roles.map((role) => {
        const Icon = role.icon;
        return (
          <div key={role.id} className="card" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: `${role.color}15`,
                  border: `1px solid ${role.color}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={15} style={{ color: role.color }} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {role.label}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {roleCounts[role.id]} user(s)
                </p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {role.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
