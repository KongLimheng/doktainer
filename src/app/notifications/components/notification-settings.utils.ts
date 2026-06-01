import type { SettingsRecord, UpdateSettingsBody } from "@/lib/api";
import { normalizeNotificationActionKeys } from "@/app/notifications/components/notification-actions";
import type { EditableNotificationSettings } from "@/app/notifications/components/notification-settings.types";
import { resolvePublicAppOrigin } from "@/server/lib/public-url";

function normalizeProviders(
  providers: SettingsRecord["notifications"]["providers"],
) {
  return providers.map((provider) => ({
    ...provider,
    actions: normalizeNotificationActionKeys(provider.actions),
  }));
}

export const emptyNotificationSettings = (): EditableNotificationSettings => ({
  general: {
    panelName: process.env.NEXT_PUBLIC_PANEL_NAME || "DOKTAINER",
    panelUrl: resolvePublicAppOrigin(),
    timezone: process.env.NEXT_PUBLIC_PANEL_TIMEZONE || "Asia/Jakarta",
    theme: "dark",
    sessionTimeoutMinutes: 30,
  },
  notifications: {
    providers: [],
  },
  security: {
    twoFactorEnabled: false,
    twoFactorPendingSetup: false,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
  },
  integrations: {
    cloudflare: {
      connected: false,
      zoneId: "",
      hasApiToken: false,
      apiToken: "",
    },
    awsS3: {
      connected: false,
      accessKeyId: "",
      region: "",
      bucket: "",
      hasSecretAccessKey: false,
      secretAccessKey: "",
    },
    github: {
      connected: false,
      hasToken: false,
      token: "",
    },
    gitlab: {
      connected: false,
      hasToken: false,
      token: "",
    },
  },
});

export function toEditableNotificationSettings(
  source: SettingsRecord,
): EditableNotificationSettings {
  return {
    ...source,
    notifications: {
      providers: normalizeProviders(source.notifications.providers),
    },
    integrations: {
      cloudflare: {
        ...source.integrations.cloudflare,
        apiToken: "",
      },
      awsS3: {
        ...source.integrations.awsS3,
        secretAccessKey: "",
      },
      github: {
        ...source.integrations.github,
        token: "",
      },
      gitlab: {
        ...source.integrations.gitlab,
        token: "",
      },
    },
  };
}

export function toNotificationSettingsPayload(
  source: EditableNotificationSettings,
): UpdateSettingsBody {
  return {
    general: source.general,
    notifications: {
      providers: normalizeProviders(source.notifications.providers),
    },
    security: source.security,
    integrations: {
      cloudflare: {
        connected: source.integrations.cloudflare.connected,
        zoneId: source.integrations.cloudflare.zoneId,
        apiToken: source.integrations.cloudflare.apiToken,
      },
      awsS3: {
        connected: source.integrations.awsS3.connected,
        accessKeyId: source.integrations.awsS3.accessKeyId,
        secretAccessKey: source.integrations.awsS3.secretAccessKey,
        region: source.integrations.awsS3.region,
        bucket: source.integrations.awsS3.bucket,
      },
      github: {
        connected: source.integrations.github.connected,
        token: source.integrations.github.token,
      },
      gitlab: {
        connected: source.integrations.gitlab.connected,
        token: source.integrations.gitlab.token,
      },
    },
  };
}
