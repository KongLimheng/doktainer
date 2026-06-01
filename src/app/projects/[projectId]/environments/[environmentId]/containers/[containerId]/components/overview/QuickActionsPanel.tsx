import type { AppAction } from "../../types/app-detail-types";
import PanelShell from "./PanelShell";

interface QuickActionsPanelProps {
  actions: AppAction[];
  onAction: (action: AppAction["id"]) => void;
}

export default function QuickActionsPanel({
  actions,
  onAction,
}: QuickActionsPanelProps) {
  return (
    <PanelShell title="Quick Actions">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const className =
            action.tone === "primary"
              ? "btn btn-primary"
              : action.tone === "danger"
                ? "btn btn-danger"
                : "btn btn-ghost";

          return (
            <button
              type="button"
              key={action.label}
              onClick={() => onAction(action.id)}
              className={className}
              style={{
                minHeight: 35,
                fontSize: 12,
                justifyContent: "center",
              }}
            >
              <Icon size={14} />
              {action.label}
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}
