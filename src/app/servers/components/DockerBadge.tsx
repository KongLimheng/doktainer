import { AlertTriangle, Boxes, CircleDashed } from "lucide-react";
import type { DockerRuntimeStatus } from "@/lib/api";

interface DockerBadgeProps {
  docker?: DockerRuntimeStatus | null;
  error?: string | null;
  loading?: boolean;
}

export default function DockerBadge({
  docker,
  error,
  loading,
}: DockerBadgeProps) {
  if (loading) {
    return (
      <span
        className="ui-badge badge-info"
        style={{
          gap: 5,
        }}
      >
        <CircleDashed size={10} className="animate-spin" />
        Checking Docker
      </span>
    );
  }

  if (docker?.available) {
    return (
      <span
        className="ui-badge badge-online"
        title={docker.version ? `Docker ${docker.version}` : "Docker ready"}
        style={{
          gap: 5,
        }}
      >
        <Boxes size={10} />
        Docker Ready
      </span>
    );
  }

  if (docker?.probeFailed) {
    return (
      <span
        className="ui-badge badge-warning"
        title={docker.reason || "Docker status check failed"}
        style={{
          gap: 5,
        }}
      >
        <AlertTriangle size={10} />
        Check Failed
      </span>
    );
  }

  if (error) {
    return (
      <span
        className="ui-badge badge-warning"
        title={error}
        style={{
          gap: 5,
        }}
      >
        <AlertTriangle size={10} />
        Status Unavailable
      </span>
    );
  }

  return (
    <span
      className="ui-badge badge-offline"
      title={docker?.reason || "Docker is not ready on this server"}
      style={{
        gap: 5,
      }}
    >
      <AlertTriangle size={10} />
      {/* Fresh Vps / No Docker */}
      No Docker Installed
    </span>
  );
}
