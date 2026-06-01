import type { EnvironmentContainerStatus } from "../../types/environment-container-types";

interface EnvironmentStatusBadgeProps {
  status: EnvironmentContainerStatus;
}

const badgeClassByStatus: Record<EnvironmentContainerStatus, string> = {
  RUNNING: "badge-online",
  STOPPED: "badge-offline",
  STARTING: "badge-warning",
  STOPPING: "badge-warning",
  PAUSED: "badge-warning",
  ERROR: "badge-offline",
};

export default function EnvironmentStatusBadge({
  status,
}: EnvironmentStatusBadgeProps) {
  return (
    <span
      className={`ui-badge ${badgeClassByStatus[status]}`}
      style={{ padding: "3px 10px" }}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
