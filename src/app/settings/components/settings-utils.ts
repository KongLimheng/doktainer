import type { SettingsRecord, UpdateSettingsBody } from "@/lib/api";
import type { EditableSettings } from "@/app/settings/components/settings-types";
import { resolvePublicAppOrigin } from "@/server/lib/public-url";

export const emptySettings = (): EditableSettings => ({
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

export function toEditableSettings(source: SettingsRecord): EditableSettings {
  return {
    ...source,
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

export function toPayload(source: EditableSettings): UpdateSettingsBody {
  return {
    general: source.general,
    notifications: source.notifications,
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
