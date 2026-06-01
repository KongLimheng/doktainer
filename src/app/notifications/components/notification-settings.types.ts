import type {
  NotificationProviderRecord,
  NotificationProviderType,
  SettingsRecord,
} from "@/lib/api";

export type NotificationProviderItem = NotificationProviderRecord;
export type NotificationProviderKind = NotificationProviderType;

export type EditableNotificationSettings = SettingsRecord & {
  integrations: {
    cloudflare: SettingsRecord["integrations"]["cloudflare"] & {
      apiToken: string;
    };
    awsS3: SettingsRecord["integrations"]["awsS3"] & {
      secretAccessKey: string;
    };
    github: SettingsRecord["integrations"]["github"] & {
      token: string;
    };
    gitlab: SettingsRecord["integrations"]["gitlab"] & {
      token: string;
    };
  };
};
