import { Crown, Shield, User } from "lucide-react";
import type { UserRole } from "@/lib/api";

export const roles: Array<{
  id: UserRole;
  label: string;
  color: string;
  icon: typeof Crown;
  desc: string;
}> = [
  {
    id: "SUPER_ADMIN",
    label: "Super Admin",
    color: "#ef4444",
    icon: Crown,
    desc: "Full access to everything",
  },
  {
    id: "OPERATOR",
    label: "Operator",
    color: "#f59e0b",
    icon: Shield,
    desc: "Manage operational workflows",
  },
  {
    id: "DEVELOPER",
    label: "Developer",
    color: "#3b82f6",
    icon: User,
    desc: "Deploy and operate assigned workloads",
  },
  {
    id: "VIEWER",
    label: "Viewer",
    color: "#64748b",
    icon: User,
    desc: "Read-only visibility",
  },
];

export const manageableRoles = roles.filter(
  (role) => role.id !== "SUPER_ADMIN",
);

export function getRoleMeta(roleId: UserRole) {
  return roles.find((role) => role.id === roleId) ?? roles[3];
}