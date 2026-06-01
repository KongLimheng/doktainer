import type { AppDetail } from "../../types/app-detail-types";
import DeploymentPanel from "./DeploymentPanel";
import DomainsPanel from "./DomainsPanel";
import HealthPanel from "./HealthPanel";
import RecentLogsPanel from "./RecentLogsPanel";
import RuntimeContainersPanel from "./RuntimeContainersPanel";

interface AppOverviewProps {
  app: AppDetail;
  logsAutoRefresh: boolean;
  logsRefreshing: boolean;
  onLogsAutoRefreshChange: (enabled: boolean) => void;
}

export default function AppOverview({
  app,
  logsAutoRefresh,
  logsRefreshing,
  onLogsAutoRefreshChange,
}: AppOverviewProps) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
            gap: 12,
          }}
        >
          <DeploymentPanel deployment={app.deployment} />
          <HealthPanel health={app.health} />
        </div>
        <RuntimeContainersPanel containers={app.runtimeContainers} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <DomainsPanel domains={app.domains} />
        <RecentLogsPanel
          logs={app.logs}
          autoRefresh={logsAutoRefresh}
          refreshing={logsRefreshing}
          onAutoRefreshChange={onLogsAutoRefreshChange}
        />
      </div>
    </section>
  );
}
