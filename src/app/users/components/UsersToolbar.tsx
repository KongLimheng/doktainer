import { Clock, Loader2, Lock, Plus, RefreshCw, Users } from "lucide-react";

export type UsersTabKey = "active-users" | "pending-invites" | "archived-users";

interface UsersToolbarProps {
  activeTab: UsersTabKey;
  activeUsersCount: number;
  invitationsCount: number;
  archivedUsersCount: number;
  loading: boolean;
  refreshing: boolean;
  canInvite: boolean;
  onTabChange: (tab: UsersTabKey) => void;
  onRefresh: () => void | Promise<void>;
  onInvite: () => void;
}

export default function UsersToolbar({
  activeTab,
  activeUsersCount,
  invitationsCount,
  archivedUsersCount,
  loading,
  refreshing,
  canInvite,
  onTabChange,
  onRefresh,
  onInvite,
}: UsersToolbarProps) {
  const tabs = [
    {
      key: "active-users" as const,
      label: `Active Users (${activeUsersCount})`,
      icon: Users,
    },
    {
      key: "pending-invites" as const,
      label: `Pending Invites (${invitationsCount})`,
      icon: Clock,
    },
    {
      key: "archived-users" as const,
      label: `Archived Users (${archivedUsersCount})`,
      icon: Lock,
    },
  ];

  return (
    <div
      className="card"
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--bg-card)",
          borderRadius: 10,
          padding: 4,
          border: "1px solid var(--border)",
        }}
      >
        {tabs.map((tab) => {
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
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => void onRefresh()}
          disabled={loading || refreshing}
        >
          {refreshing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Refresh
        </button>
        {canInvite ? (
          <button
            className="btn btn-primary"
            style={{ fontSize: 12 }}
            onClick={onInvite}
          >
            <Plus size={12} /> Invite User
          </button>
        ) : null}
      </div>
    </div>
  );
}
