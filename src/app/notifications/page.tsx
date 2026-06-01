"use client";

import { useEffect, useState } from "react";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import ToastViewport from "@/components/ToastViewport";
import GuardedPage from "@/components/GuardedPage";
import { settingsApi, type SettingsRecord } from "@/lib/api";
import NotificationsSettingsPanel from "@/app/notifications/components/NotificationsSettingsPanel";
import type {
  EditableNotificationSettings,
  NotificationProviderItem,
} from "@/app/notifications/components/notification-settings.types";
import {
  emptyNotificationSettings,
  toEditableNotificationSettings,
  toNotificationSettingsPayload,
} from "@/app/notifications/components/notification-settings.utils";
import {
  Banner,
  SettingsLoadingPanel,
} from "@/app/settings/components/SettingsPrimitives";
import { useToastManager } from "@/lib/use-toast-manager";

type PendingConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning" | "info";
  note?: string;
  onConfirm: () => void;
};

export default function NotificationsPage() {
  const [settings, setSettings] = useState<EditableNotificationSettings>(
    emptyNotificationSettings,
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] =
    useState<PendingConfirmAction | null>(null);
  const { toasts, pushToast, dismissToast } = useToastManager();

  const syncSettingsFromServer = (source: SettingsRecord) => {
    setSettings(toEditableNotificationSettings(source));
  };

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await settingsApi.get();
        if (!mounted) return;
        syncSettingsFromServer(response.data);
      } catch (err) {
        if (!mounted) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load settings",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const persistSettings = async (
    nextSettings: EditableNotificationSettings,
    options?: { providerId?: string | null; successMessage?: string },
  ) => {
    setSavingProviderId(options?.providerId ?? null);

    try {
      const response = await settingsApi.update(
        toNotificationSettingsPayload(nextSettings),
      );
      syncSettingsFromServer(response.data);
      pushToast({
        tone: "success",
        title: "Notification Updated",
        message:
          options?.successMessage ||
          response.message ||
          "Notification settings saved",
      });
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Save Failed",
        message:
          err instanceof Error ? err.message : "Failed to save notifications",
      });
    } finally {
      setSavingProviderId(null);
    }
  };

  const applyProviderChange = (
    recipe: (
      current: EditableNotificationSettings,
    ) => EditableNotificationSettings,
    options?: { providerId?: string | null; successMessage?: string },
  ) => {
    let nextState: EditableNotificationSettings | null = null;

    setSettings((current) => {
      nextState = recipe(current);
      return nextState;
    });

    queueMicrotask(() => {
      if (nextState) {
        void persistSettings(nextState, options);
      }
    });
  };

  const upsertProvider = async (
    provider: EditableNotificationSettings["notifications"]["providers"][number],
  ) => {
    const isExisting = settings.notifications.providers.some(
      (item) => item.id === provider.id,
    );

    applyProviderChange(
      (current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          providers: isExisting
            ? current.notifications.providers.map((item) =>
                item.id === provider.id ? provider : item,
              )
            : [...current.notifications.providers, provider],
        },
      }),
      {
        providerId: provider.id,
        successMessage: isExisting
          ? "Notification provider updated"
          : "Notification provider created",
      },
    );
  };

  const toggleProvider = async (providerId: string) => {
    applyProviderChange(
      (current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          providers: current.notifications.providers.map((item) =>
            item.id === providerId ? { ...item, enabled: !item.enabled } : item,
          ),
        },
      }),
      {
        providerId,
        successMessage: "Provider status updated",
      },
    );
  };

  const performDeleteProvider = async (provider: NotificationProviderItem) => {
    const providerId = provider.id;
    applyProviderChange(
      (current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          providers: current.notifications.providers.filter(
            (item) => item.id !== providerId,
          ),
        },
      }),
      {
        providerId,
        successMessage: "Notification provider deleted",
      },
    );
  };

  const handleDeleteProvider = (provider: NotificationProviderItem) => {
    setConfirmDialog({
      title: "Delete Notification Provider",
      description: `Delete notification provider "${provider.name}"?`,
      confirmLabel: "Delete Provider",
      tone: "danger",
      note: "This removes the saved notification provider configuration and credentials from Doktainer.",
      onConfirm: () => {
        void performDeleteProvider(provider);
      },
    });
  };

  const testNotification = async (providerId: string) => {
    const selected = settings.notifications.providers.find(
      (item) => item.id === providerId,
    );
    if (!selected) {
      pushToast({
        tone: "error",
        title: "Provider Not Found",
        message: "Notification provider tidak ditemukan.",
      });
      return;
    }

    if (
      selected.type !== "email" &&
      selected.type !== "telegram" &&
      selected.type !== "discord" &&
      selected.type !== "custom"
    ) {
      pushToast({
        tone: "warning",
        title: "Live Test Unavailable",
        message:
          "Live test saat ini hanya tersedia untuk Email, Telegram, Discord, dan Custom Webhook.",
      });
      return;
    }

    const payloadMap: Record<
      "email" | "telegram" | "discord" | "custom",
      Record<string, unknown>
    > = {
      email: {
        id: selected.id,
        name: selected.name,
        enabled: selected.enabled,
        smtpHost: selected.smtpHost,
        smtpPort: selected.smtpPort,
        smtpSecure: selected.smtpSecure,
        smtpUsername: selected.smtpUsername,
        smtpPassword: selected.smtpPassword,
        smtpFromEmail: selected.smtpFromEmail,
        smtpFromName: selected.smtpFromName,
      },
      telegram: {
        id: selected.id,
        name: selected.name,
        enabled: selected.enabled,
        telegramBotToken: selected.telegramBotToken,
        telegramChatId: selected.telegramChatId,
      },
      discord: {
        id: selected.id,
        name: selected.name,
        enabled: selected.enabled,
        webhookUrl: selected.webhookUrl,
      },
      custom: {
        id: selected.id,
        name: selected.name,
        enabled: selected.enabled,
        webhookUrl: selected.webhookUrl,
      },
    };

    setActionLoading(`notify-${selected.type}-${selected.id}`);

    try {
      const response = await settingsApi.testNotification(
        selected.type,
        payloadMap[selected.type],
      );
      pushToast({
        tone: "success",
        title: "Test Notification Sent",
        message: response.message || "Test notification sent successfully",
      });
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Test Failed",
        message: err instanceof Error ? err.message : "Action failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <GuardedPage
      route="/notifications"
      title="Notifications"
      subtitle="Manage notification providers and select which events will trigger notifications."
      redirectSubtitle="Redirecting to a page allowed for your role"
    >
      <ConfirmActionDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        tone={confirmDialog?.tone ?? "danger"}
        note={confirmDialog?.note}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => {
          const current = confirmDialog;
          setConfirmDialog(null);
          current?.onConfirm();
        }}
      />
      <div
        className="animate-slide-in"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {loadError ? <Banner message={loadError} tone="error" /> : null}

        {loading ? (
          <SettingsLoadingPanel />
        ) : (
          <NotificationsSettingsPanel
            settings={settings}
            actionLoading={actionLoading}
            savingProviderId={savingProviderId}
            testNotification={testNotification}
            onUpsertProvider={upsertProvider}
            onToggleProvider={toggleProvider}
            onDeleteProvider={handleDeleteProvider}
          />
        )}
      </div>

      <ToastViewport toasts={toasts} onClose={dismissToast} />
    </GuardedPage>
  );
}
