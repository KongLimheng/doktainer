import { CheckCircle2, ExternalLink } from "lucide-react";
import type { DeploymentSummary } from "../../types/app-detail-types";
import InfoRows from "./InfoRows";
import PanelShell from "./PanelShell";

interface DeploymentPanelProps {
  deployment: DeploymentSummary;
}

export default function DeploymentPanel({ deployment }: DeploymentPanelProps) {
  return (
    <PanelShell title="Deployment">
      <InfoRows
        rows={[
          {
            label: "Status",
            value: (
              <span
                style={{
                  color: "var(--accent-green)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <CheckCircle2 size={13} />
                {deployment.status}
              </span>
            ),
          },
          {
            label: "Commit",
            value: (
              <span
                style={{
                  color: "var(--accent-blue)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {deployment.commit}
                <ExternalLink size={11} />
              </span>
            ),
          },
          { label: "Branch", value: deployment.branch },
          { label: "Message", value: deployment.message },
          { label: "Deployed At", value: deployment.deployedAt },
          { label: "Duration", value: deployment.duration },
        ]}
      />
      {/* <button
        type="button"
        className="btn btn-ghost"
        style={{ width: "100%", marginTop: 13, fontSize: 12 }}
      >
        View Deployment History
      </button> */}
    </PanelShell>
  );
}
