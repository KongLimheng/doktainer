import { DomainDiscoverySource } from "@/lib/api";
import { Zap } from "lucide-react";
import { getDiscoverySourceMeta } from "./domain-utils";

interface DiscoveryBadgeProps {
  source: DomainDiscoverySource;
}

export default function DiscoveryBadge({ source }: DiscoveryBadgeProps) {
  const meta = getDiscoverySourceMeta(source);

  return (
    <span
      title={`${meta.label} ${meta.detail}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        marginTop: 5,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        color: meta.color,
        background: meta.background,
        border: `1px solid ${meta.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <Zap size={10} />
      {meta.label} {meta.detail}
    </span>
  );
}
