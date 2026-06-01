"use client";

import { SETTINGS_TABS } from "@/app/settings/components/settings-config";
import type { SettingsTab } from "@/app/settings/components/settings-types";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export default function SettingsTabs({
  activeTab,
  onChange,
}: SettingsTabsProps) {
  return (
    <div className="card" style={{ padding: 8, width: 200, flexShrink: 0 }}>
      {SETTINGS_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background:
                activeTab === tab.id ? "rgba(37,99,235,0.12)" : "transparent",
              color: activeTab === tab.id ? "#2563eb" : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 2,
              textAlign: "left",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(37,99,235,0.24)"
                  : "1px solid transparent",
            }}
          >
            <Icon
              size={14}
              style={{
                color: activeTab === tab.id ? "#2563eb" : "var(--text-muted)",
              }}
            />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
