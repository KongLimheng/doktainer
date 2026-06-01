"use client";

import { Globe, Loader2, Lock, Plus, RefreshCw } from "lucide-react";
import { SSLTabKey } from "@/app/ssl/components/ssl-utils";

interface SSLToolbarProps {
  activeTab: SSLTabKey;
  syncing: boolean;
  actionsBusy?: boolean;
  issueableDomainsCount: number;
  onTabChange: (tab: SSLTabKey) => void;
  onCheckAll: () => void;
  onSync: () => void;
  onAdd: () => void;
}

export default function SSLToolbar({
  activeTab,
  syncing,
  actionsBusy = false,
  issueableDomainsCount,
  onTabChange,
  onCheckAll,
  onSync,
  onAdd,
}: SSLToolbarProps) {
  return (
    <div className="ui-tab-shell">
      <div className="ui-tab-scroll no-scrollbar" style={{}}>
        {[
          { key: "certs" as const, label: "SSL Certificates", icon: Lock },
          { key: "domains" as const, label: "Domains Need SSL", icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 16px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                background:
                  activeTab === tab.key
                    ? "rgba(59,130,246,0.15)"
                    : "transparent",
                color: activeTab === tab.key ? "#3b82f6" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="ui-toolbar-actions">
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={onCheckAll}
          disabled={syncing || actionsBusy}
          title={
            actionsBusy
              ? "Wait for the current SSL action to finish"
              : undefined
          }
        >
          <RefreshCw size={12} /> Check All
        </button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={onSync}
          disabled={syncing || actionsBusy}
          title={
            actionsBusy
              ? "Wait for the current SSL action to finish"
              : undefined
          }
        >
          {syncing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Sync from Server
        </button>
        <button
          className="btn btn-primary"
          style={{ fontSize: 12 }}
          onClick={onAdd}
          disabled={
            activeTab === "domains"
              ? issueableDomainsCount === 0 || syncing || actionsBusy
              : syncing || actionsBusy
          }
        >
          <Plus size={12} />
          {activeTab === "domains" ? " Choose Domain" : " Issue Certificate"}
        </button>
      </div>
    </div>
  );
}
