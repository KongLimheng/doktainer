import type { UserRole } from "@/lib/api";

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

export function formatRelativeDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return date.toLocaleString();
}

export function getServerAccessSummary(input: {
  role: UserRole;
  allServersAccess: boolean;
  names: string[];
}) {
  if (input.role === "SUPER_ADMIN" || input.allServersAccess) {
    return {
      label: "All servers",
      color: "#10b981",
      tone: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.25)",
    };
  }
  if (input.names.length === 0) {
    return {
      label: "No servers assigned",
      color: "#f59e0b",
      tone: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.25)",
    };
  }
  return {
    label: input.names.join(", "),
    color: "#3b82f6",
    tone: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
  };
}

export function copyText(value: string) {
  return navigator.clipboard.writeText(value).catch(() => undefined);
}
