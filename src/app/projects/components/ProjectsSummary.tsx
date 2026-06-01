import { Activity, Boxes, FolderKanban, Layers3 } from "lucide-react";

interface ProjectsSummaryProps {
  projectCount: number;
  environmentCount: number;
  assignedServerCount: number;
  containerCount: number;
}

const cards = [
  {
    key: "projects",
    label: "Total Projects",
    icon: FolderKanban,
    accent: "#38bdf8",
    getValue: (props: ProjectsSummaryProps) => props.projectCount,
  },
  {
    key: "environments",
    label: "Environments",
    icon: Layers3,
    accent: "#f59e0b",
    getValue: (props: ProjectsSummaryProps) => props.environmentCount,
  },
  {
    key: "servers",
    label: "Servers Used",
    icon: Activity,
    accent: "#8b5cf6",
    getValue: (props: ProjectsSummaryProps) => props.assignedServerCount,
  },
  {
    key: "containers",
    label: "Attached Containers",
    icon: Boxes,
    accent: "#a78bfa",
    getValue: (props: ProjectsSummaryProps) => props.containerCount,
  },
];

export default function ProjectsSummary(props: ProjectsSummaryProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 12,
      }}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.key}
            className="card"
            style={{
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: `${card.accent}15`,
                border: `1px solid ${card.accent}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={18} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                {card.getValue(props)}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                {card.label}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
