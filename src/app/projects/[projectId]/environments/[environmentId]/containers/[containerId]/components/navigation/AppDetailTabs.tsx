import type { AppDetailTab } from "../../types/app-detail-types";

interface AppDetailTabsProps {
  tabs: Array<{ id: AppDetailTab; label: string }>;
  activeTab: AppDetailTab;
  onChange: (tab: AppDetailTab) => void;
}

export default function AppDetailTabs({
  tabs,
  activeTab,
  onChange,
}: AppDetailTabsProps) {
  return (
    <nav
      className="ui-tab-scroll"
      style={{
        width: "100%",
        borderRadius: 6,
        background: "var(--bg-card)",
        minWidth: 0,
      }}
      aria-label="App detail sections"
    >
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="btn btn-ghost"
          style={{
            minHeight: 28,
            padding: "5px 12px",
            borderRadius: 4,
            fontSize: 12,
            flex: "0 0 auto",
            borderColor:
              activeTab === tab.id
                ? "rgba(59,130,246,0.5)"
                : "transparent",
            background:
              activeTab === tab.id ? "rgba(59,130,246,0.16)" : "transparent",
            color:
              activeTab === tab.id
                ? "var(--accent-blue)"
                : "var(--text-secondary)",
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
