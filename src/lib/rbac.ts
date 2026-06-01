import type { UserRole } from "@/lib/api";
import { hasMinimumRole } from "@/lib/permissions";

const KNOWN_ROLES = new Set<UserRole>([
  "VIEWER",
  "DEVELOPER",
  "OPERATOR",
  "SUPER_ADMIN",
]);

function normalizeRole(role: string | null | undefined): UserRole | null {
  if (!role || !KNOWN_ROLES.has(role as UserRole)) {
    return null;
  }

  return role as UserRole;
}

export interface RoleCapabilities {
  role: UserRole | null;
  isViewer: boolean;
  isDeveloper: boolean;
  isOperator: boolean;
  isSuperAdmin: boolean;
  isReadOnly: boolean;
  canManageInfrastructure: boolean;
  canManageDeveloperTools: boolean;
  canManageNotifications: boolean;
  canManageUsers: boolean;
  canManageUserRoles: boolean;
  canManageSettings: boolean;
}

export function getRoleCapabilities(
  role: string | null | undefined,
): RoleCapabilities {
  const normalizedRole = normalizeRole(role);
  const canManageDeveloperTools = hasMinimumRole(
    normalizedRole ?? undefined,
    "DEVELOPER",
  );
  const canManageUsers = hasMinimumRole(
    normalizedRole ?? undefined,
    "OPERATOR",
  );

  return {
    role: normalizedRole,
    isViewer: normalizedRole === "VIEWER",
    isDeveloper: normalizedRole === "DEVELOPER",
    isOperator: normalizedRole === "OPERATOR",
    isSuperAdmin: normalizedRole === "SUPER_ADMIN",
    isReadOnly: normalizedRole === "VIEWER",
    canManageInfrastructure: canManageDeveloperTools,
    canManageDeveloperTools,
    canManageNotifications: canManageDeveloperTools,
    canManageUsers,
    canManageUserRoles: normalizedRole === "SUPER_ADMIN",
    canManageSettings: canManageUsers,
  };
}
