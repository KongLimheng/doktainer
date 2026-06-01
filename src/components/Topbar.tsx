"use client";

import { HEALTH_URL } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth-state";
import { navigation } from "@/lib/navigation";
import {
  addPreferencesListener,
  getStoredTheme,
  resolveThemePreference,
  setStoredTheme,
} from "@/lib/preferences";
import { hasMinimumRole } from "@/lib/permissions";
import {
  Bell,
  LoaderCircle,
  Menu,
  Moon,
  RefreshCw,
  Search,
  SunMedium,
  Wifi,
  WifiOff,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ConnectionState = "checking" | "online" | "offline" | "degraded";

type NotificationTone = "info" | "success" | "warning" | "error";

interface TopbarNotification {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  timestamp: number;
  read: boolean;
}

const TOPBAR_NOTIFICATIONS_KEY = "portainer-topbar-notifications";
const MAX_TOPBAR_NOTIFICATIONS = 5;

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMobileMenuToggle?: () => void;
}

export default function Topbar({
  title,
  subtitle,
  onMobileMenuToggle,
}: TopbarProps) {
  const currentUser = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("checking");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [notifications, setNotifications] = useState<TopbarNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const notificationShellRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<TopbarNotification[]>([]);
  const lastConnectionNotificationRef = useRef<ConnectionState | null>(null);

  const updateNotifications = useCallback(
    (updater: (current: TopbarNotification[]) => TopbarNotification[]) => {
      setNotifications((current) => {
        const next = updater(current).slice(0, MAX_TOPBAR_NOTIFICATIONS);
        notificationsRef.current = next;
        window.localStorage.setItem(
          TOPBAR_NOTIFICATIONS_KEY,
          JSON.stringify(next),
        );
        return next;
      });
    },
    [],
  );

  const pushNotification = useCallback(
    ({
      title: nextTitle,
      message,
      tone = "info",
    }: Omit<TopbarNotification, "id" | "timestamp" | "read">) => {
      updateNotifications((current) => [
        {
          id: `topbar-notification-${Date.now()}-${current.length}`,
          title: nextTitle,
          message,
          tone,
          timestamp: Date.now(),
          read: false,
        },
        ...current,
      ]);
    },
    [updateNotifications],
  );

  const markNotificationsRead = useCallback(() => {
    updateNotifications((current) => {
      if (current.every((notification) => notification.read)) {
        return current;
      }

      return current.map((notification) => ({
        ...notification,
        read: true,
      }));
    });
  }, [updateNotifications]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TOPBAR_NOTIFICATIONS_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as TopbarNotification[];
        const initial = parsed.slice(0, MAX_TOPBAR_NOTIFICATIONS);
        setNotifications(initial);
        notificationsRef.current = initial;
        return;
      }
    } catch {
      window.localStorage.removeItem(TOPBAR_NOTIFICATIONS_KEY);
    }

    const now = Date.now();
    const seeded: TopbarNotification[] = [
      {
        id: "seed-1",
        title: "Welcome back",
        message: currentUser?.name
          ? `${currentUser.name}, your workspace is ready.`
          : "Your workspace is ready.",
        tone: "info",
        timestamp: now - 5 * 60_000,
        read: false,
      },
      {
        id: "seed-2",
        title: "Quick search enabled",
        message: "Press Ctrl/Cmd + K to jump between dashboard pages.",
        tone: "info",
        timestamp: now - 4 * 60_000,
        read: false,
      },
      {
        id: "seed-3",
        title: "Theme switch ready",
        message: "Use the sun or moon toggle to change the panel theme.",
        tone: "info",
        timestamp: now - 3 * 60_000,
        read: false,
      },
      {
        id: "seed-4",
        title: "Connection monitor active",
        message:
          "The topbar now checks browser and API availability automatically.",
        tone: "success",
        timestamp: now - 2 * 60_000,
        read: false,
      },
      {
        id: "seed-5",
        title: "Notification center active",
        message: "The bell button shows the latest 5 topbar notifications.",
        tone: "success",
        timestamp: now - 60_000,
        read: false,
      },
    ];

    setNotifications(seeded);
    notificationsRef.current = seeded;
    window.localStorage.setItem(
      TOPBAR_NOTIFICATIONS_KEY,
      JSON.stringify(seeded),
    );
  }, [currentUser?.name]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      setResolvedTheme(resolveThemePreference(getStoredTheme()));
    };

    syncTheme();

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onThemeMediaChange = () => syncTheme();
    media.addEventListener("change", onThemeMediaChange);
    const removePreferencesListener = addPreferencesListener(syncTheme);

    return () => {
      media.removeEventListener("change", onThemeMediaChange);
      removePreferencesListener();
    };
  }, []);

  const visibleRoutes = useMemo(
    () =>
      navigation
        .flatMap((section) =>
          section.items.map((item) => ({
            ...item,
            sectionLabel: section.label,
          })),
        )
        .filter((item) => hasMinimumRole(currentUser?.role, item.minRole)),
    [currentUser?.role],
  );

  const filteredRoutes = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return visibleRoutes.slice(0, 8);
    }

    return visibleRoutes
      .filter((item) => {
        const haystack = [
          item.label,
          item.href,
          item.sectionLabel,
          ...(item.keywords ?? []),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [query, visibleRoutes]);

  const checkConnection = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setConnectionState("offline");
      return;
    }

    setConnectionState("checking");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(HEALTH_URL, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      setConnectionState(response.ok ? "online" : "degraded");
    } catch {
      setConnectionState("degraded");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    void checkConnection();

    const handleOnline = () => {
      void checkConnection();
    };

    const handleOffline = () => {
      setConnectionState("offline");
    };

    const interval = window.setInterval(() => {
      void checkConnection();
    }, 30000);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!searchShellRef.current?.contains(target)) {
        setSearchOpen(false);
      }

      if (!notificationShellRef.current?.contains(target)) {
        setNotificationOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
        return;
      }

      const shortcutPressed =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (!shortcutPressed) return;

      event.preventDefault();
      setNotificationOpen(false);
      setSearchOpen(true);
      window.setTimeout(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
      }, 0);
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    setQuery("");
    setSearchOpen(false);
    setNotificationOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notificationOpen) {
      return;
    }

    markNotificationsRead();
  }, [markNotificationsRead, notificationOpen]);

  const shortcutLabel = useMemo(() => {
    if (typeof navigator !== "undefined" && /mac/i.test(navigator.platform)) {
      return ["Cmd", "K"] as const;
    }

    return ["Ctrl", "K"] as const;
  }, []);

  const connectionMeta = {
    checking: {
      label: "Checking panel connection",
      color: "#f59e0b",
      background: "rgba(245, 158, 11, 0.1)",
      border: "rgba(245, 158, 11, 0.3)",
      icon: <LoaderCircle size={13} className="animate-spin" />,
    },
    online: {
      label: "Browser online and API reachable",
      color: "#10b981",
      background: "rgba(16, 185, 129, 0.1)",
      border: "rgba(16, 185, 129, 0.3)",
      icon: <Wifi size={13} />,
    },
    offline: {
      label: "Browser offline. Check your network.",
      color: "#ef4444",
      background: "rgba(239, 68, 68, 0.1)",
      border: "rgba(239, 68, 68, 0.3)",
      icon: <WifiOff size={13} />,
    },
    degraded: {
      label: "Browser online, but backend API is not responding",
      color: "#f59e0b",
      background: "rgba(245, 158, 11, 0.1)",
      border: "rgba(245, 158, 11, 0.3)",
      icon: <WifiOff size={13} />,
    },
  }[connectionState];

  const handleNavigate = (href: string) => {
    setSearchOpen(false);
    setNotificationOpen(false);
    setQuery("");
    router.push(href);
  };

  useEffect(() => {
    if (connectionState === "checking") {
      return;
    }

    if (lastConnectionNotificationRef.current === connectionState) {
      return;
    }

    lastConnectionNotificationRef.current = connectionState;

    if (connectionState === "online") {
      pushNotification({
        title: "Connection restored",
        message: "Browser is online and the backend API is reachable.",
        tone: "success",
      });
      return;
    }

    if (connectionState === "offline") {
      pushNotification({
        title: "Browser offline",
        message:
          "Network access was lost. Reconnect to restore dashboard features.",
        tone: "error",
      });
      return;
    }

    pushNotification({
      title: "Backend degraded",
      message:
        "Browser is online, but the API health check did not complete cleanly.",
      tone: "warning",
    });
  }, [connectionState, pushNotification]);

  const handleThemeToggle = () => {
    const nextTheme = resolvedTheme === "light" ? "dark" : "light";
    setStoredTheme(nextTheme);
    pushNotification({
      title: "Theme updated",
      message: `Dashboard theme switched to ${nextTheme} mode.`,
      tone: "info",
    });
  };

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const notificationToneMeta: Record<
    NotificationTone,
    { dot: string; border: string; background: string }
  > = {
    info: {
      dot: "#3b82f6",
      border: "rgba(59, 130, 246, 0.2)",
      background: "rgba(59, 130, 246, 0.08)",
    },
    success: {
      dot: "#10b981",
      border: "rgba(16, 185, 129, 0.2)",
      background: "rgba(16, 185, 129, 0.08)",
    },
    warning: {
      dot: "#f59e0b",
      border: "rgba(245, 158, 11, 0.2)",
      background: "rgba(245, 158, 11, 0.08)",
    },
    error: {
      dot: "#ef4444",
      border: "rgba(239, 68, 68, 0.2)",
      background: "rgba(239, 68, 68, 0.08)",
    },
  };

  const formatNotificationTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;

    if (diff < 60_000) {
      return "Just now";
    }

    if (diff < 3_600_000) {
      return `${Math.floor(diff / 60_000)}m ago`;
    }

    if (diff < 86_400_000) {
      return `${Math.floor(diff / 3_600_000)}h ago`;
    }

    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleRefresh = () => {
    const nextNotifications = [
      {
        id: `topbar-notification-${Date.now()}-${notificationsRef.current.length}`,
        title: "Dashboard refresh",
        message: "The current page is reloading.",
        tone: "info" as const,
        timestamp: Date.now(),
        read: false,
      },
      ...notificationsRef.current,
    ].slice(0, MAX_TOPBAR_NOTIFICATIONS);

    notificationsRef.current = nextNotifications;
    window.localStorage.setItem(
      TOPBAR_NOTIFICATIONS_KEY,
      JSON.stringify(nextNotifications),
    );
    setNotifications(nextNotifications);
    window.location.reload();
  };

  return (
    <header
      style={{
        height: 64,
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        gap: 12,
        flexShrink: 0,
      }}
      className="md:px-6 md:gap-4"
    >
      {/* Left: hamburger (mobile) + title */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
      >
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
            }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div style={{ minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="hidden md:block"
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 1,
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <div
          ref={searchShellRef}
          className="hidden sm:flex"
          style={{
            position: "relative",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            width: 240,
          }}
        >
          <Search
            size={13}
            style={{ color: "var(--text-muted)", flexShrink: 0 }}
          />
          <input
            ref={searchRef}
            type="text"
            name="panel-route-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && filteredRoutes[0]) {
                event.preventDefault();
                handleNavigate(filteredRoutes[0].href);
              }

              if (event.key === "Escape") {
                event.preventDefault();
                setSearchOpen(false);
                searchRef.current?.blur();
              }
            }}
            placeholder="Search pages..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13,
              width: "100%",
            }}
          />
          {!query && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {shortcutLabel.map((label) => (
                <kbd
                  key={label}
                  style={{
                    minWidth: 22,
                    height: 18,
                    padding: "0 6px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                    fontSize: 10,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {label}
                </kbd>
              ))}
            </div>
          )}

          {searchOpen && (
            <div
              className="card animate-slide-in"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                zIndex: 100,
                overflow: "hidden",
                boxShadow: "0 16px 32px rgba(2, 6, 23, 0.26)",
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                {query
                  ? `Showing ${filteredRoutes.length} result${filteredRoutes.length === 1 ? "" : "s"}`
                  : "Quick navigation"}
              </div>

              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => handleNavigate(item.href)}
                      style={{
                        width: "100%",
                        border: "none",
                        background: active
                          ? "rgba(59, 130, 246, 0.08)"
                          : "transparent",
                        color: "inherit",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderBottom: "1px solid rgba(30, 42, 61, 0.35)",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "rgba(59, 130, 246, 0.12)",
                          color: "#3b82f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.sectionLabel} · {item.href}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "14px 12px",
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  No matching pages.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live clock */}
        <div
          className="hidden sm:flex"
          style={{
            alignItems: "center",
            gap: 6,
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
          }}
        >
          <div
            className="animate-pulse-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10b981",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--text-secondary)",
            }}
          >
            {time}
          </span>
        </div>

        <button
          onClick={handleThemeToggle}
          className="tooltip"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color:
              resolvedTheme === "light" ? "#f59e0b" : "var(--text-secondary)",
          }}
          aria-label={
            resolvedTheme === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          }
        >
          {resolvedTheme === "light" ? (
            <Moon size={14} />
          ) : (
            <SunMedium size={14} />
          )}
          <span className="tooltip-content">
            {resolvedTheme === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"}
          </span>
        </button>

        {/* Connection status */}
        <button
          onClick={() => void checkConnection()}
          className="tooltip hidden md:flex md:items-center"
          style={{
            background: connectionMeta.background,
            border: `1px solid ${connectionMeta.border}`,
            borderRadius: 8,
            padding: "6px 10px",
            gap: 6,
            cursor: "pointer",
            color: connectionMeta.color,
            fontSize: 12,
            fontWeight: 500,
          }}
          aria-label="Re-check connection status"
        >
          {connectionMeta.icon}
          <span className="tooltip-content">{connectionMeta.label}</span>
        </button>

        {/* Refresh */}
        <button
          className="btn btn-ghost hidden md:flex"
          style={{ padding: "6px 10px" }}
          title="Refresh"
          onClick={handleRefresh}
        >
          <RefreshCw size={13} />
        </button>

        {/* Notifications */}
        <div ref={notificationShellRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setNotificationOpen((current) => !current);
            }}
            style={{
              position: "relative",
              background: notificationOpen
                ? "rgba(59, 130, 246, 0.08)"
                : "var(--bg-input)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              color: notificationOpen
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Open notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: "#ef4444",
                  border: "2px solid var(--bg-secondary)",
                  color: "#ffffff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  lineHeight: 1,
                }}
              >
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div
              className="card animate-slide-in"
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                zIndex: 110,
                overflow: "hidden",
                boxShadow: "0 16px 32px rgba(2, 6, 23, 0.22)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Notifications
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    Latest {notifications.length} updates
                  </div>
                </div>
                <button
                  type="button"
                  onClick={markNotificationsRead}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#3b82f6",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Mark all read
                </button>
              </div>

              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {notifications.map((notification) => {
                  const toneMeta = notificationToneMeta[notification.tone];

                  return (
                    <div
                      key={notification.id}
                      style={{
                        padding: "12px 14px",
                        borderBottom: "1px solid rgba(30, 42, 61, 0.18)",
                        background: notification.read
                          ? "transparent"
                          : toneMeta.background,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: toneMeta.dot,
                            marginTop: 4,
                            flexShrink: 0,
                            boxShadow: `0 0 0 4px ${toneMeta.border}`,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                              }}
                            >
                              {notification.title}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatNotificationTimestamp(
                                notification.timestamp,
                              )}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--text-secondary)",
                              lineHeight: 1.5,
                            }}
                          >
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
