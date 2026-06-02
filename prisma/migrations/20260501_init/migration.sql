-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'DEVELOPER', 'VIEWER');

-- CreateEnum
CREATE TYPE "NotificationProviderType" AS ENUM ('SLACK', 'TELEGRAM', 'DISCORD', 'LARK', 'TEAMS', 'EMAIL', 'RESEND', 'GOTIFY', 'NTFY', 'MATTERMOST', 'PUSHOVER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntegrationProviderType" AS ENUM ('CLOUDFLARE', 'AWS_S3', 'GITHUB', 'GITLAB');

-- CreateEnum
CREATE TYPE "GitProviderType" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET', 'GITEA');

-- CreateEnum
CREATE TYPE "S3StorageProvider" AS ENUM ('AWS_S3', 'ALIBABA_OSS', 'ARVAN_AOS', 'CEPH', 'CHINA_MOBILE_EOS', 'CLOUDFLARE_R2', 'DIGITALOCEAN_SPACES', 'DREAMOBJECTS', 'GOOGLE_CLOUD_STORAGE', 'HUAWEI_OBS', 'IBM_COS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SshAuthType" AS ENUM ('PASSWORD', 'SSH_KEY');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('RUNNING', 'STOPPED', 'STARTING', 'STOPPING', 'ERROR', 'PAUSED');

-- CreateEnum
CREATE TYPE "ContainerSourceType" AS ENUM ('APP_INSTALLER', 'MANUAL', 'GIT_CLONE', 'GIT_PROVIDER');

-- CreateEnum
CREATE TYPE "ContainerDeployMode" AS ENUM ('IMAGE', 'DOCKERFILE', 'COMPOSE');

-- CreateEnum
CREATE TYPE "RepositoryVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DnsType" AS ENUM ('A', 'AAAA', 'CNAME', 'MX', 'TXT');

-- CreateEnum
CREATE TYPE "ProxyType" AS ENUM ('TRAEFIK', 'NGINX', 'CADDY', 'NONE');

-- CreateEnum
CREATE TYPE "DomainDiscoverySource" AS ENUM ('MANUAL', 'NGINX', 'TRAEFIK', 'CADDY', 'CADDY_ADMIN', 'CERTBOT');

-- CreateEnum
CREATE TYPE "SslStatus" AS ENUM ('VALID', 'EXPIRING', 'EXPIRED', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('AUTH', 'SERVER', 'CONTAINER', 'DOMAIN', 'SSL', 'SECURITY', 'SYSTEM', 'TERMINAL');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'SUCCESS');

-- CreateEnum
CREATE TYPE "AppInstallStatus" AS ENUM ('PENDING', 'INSTALLING', 'RUNNING', 'STARTING', 'STOPPING', 'STOPPED', 'PAUSED', 'UNKNOWN', 'FAILED', 'REMOVED');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('DATABASE', 'VOLUME', 'FULL');

-- CreateEnum
CREATE TYPE "DatabaseEngine" AS ENUM ('POSTGRESQL', 'MYSQL', 'MARIADB', 'MONGODB', 'REDIS');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allServersAccess" BOOLEAN NOT NULL DEFAULT true,
    "activeOrganizationId" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "panelName" TEXT NOT NULL DEFAULT 'DOKTAINER',
    "panelUrl" TEXT NOT NULL DEFAULT 'http://localhost:3000',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecretEnc" TEXT,
    "twoFactorPendingSecretEnc" TEXT,
    "ipWhitelistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "NotificationProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channel" TEXT,
    "webhookUrlEnc" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUsername" TEXT,
    "smtpPasswordEnc" TEXT,
    "smtpFromEmail" TEXT,
    "smtpFromName" TEXT,
    "telegramChatId" TEXT,
    "telegramBotTokenEnc" TEXT,
    "serverUrl" TEXT,
    "topic" TEXT,
    "userKey" TEXT,
    "apiKeyEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "IntegrationProviderType" NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "zoneId" TEXT,
    "apiTokenEnc" TEXT,
    "accessKeyId" TEXT,
    "secretAccessKeyEnc" TEXT,
    "region" TEXT,
    "bucket" TEXT,
    "tokenEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_storage_destinations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serverId" TEXT,
    "name" TEXT NOT NULL,
    "provider" "S3StorageProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "accessKeyId" TEXT NOT NULL,
    "secretAccessKeyEnc" TEXT,
    "region" TEXT,
    "bucket" TEXT NOT NULL,
    "endpoint" TEXT,
    "additionalFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_storage_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_git_providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "GitProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "appName" TEXT NOT NULL,
    "appId" TEXT,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "webhookSecretEnc" TEXT,
    "appUrl" TEXT,
    "installationUrl" TEXT,
    "providerUrl" TEXT,
    "internalUrl" TEXT,
    "accountUsername" TEXT,
    "accountEmail" TEXT,
    "namespace" TEXT,
    "organizationScoped" BOOLEAN NOT NULL DEFAULT false,
    "organizationName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_git_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_server_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_server_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "allServersAccess" BOOLEAN NOT NULL DEFAULT true,
    "serverIds" TEXT[],
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT[],
    "userId" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "sshPort" INTEGER NOT NULL DEFAULT 22,
    "username" TEXT NOT NULL DEFAULT 'root',
    "authType" "SshAuthType" NOT NULL DEFAULT 'PASSWORD',
    "sshKeyEnc" TEXT,
    "passwordEnc" TEXT,
    "status" "ServerStatus" NOT NULL DEFAULT 'UNKNOWN',
    "os" TEXT,
    "location" TEXT,
    "tags" TEXT[],
    "lastHealthAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_metrics" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "cpuPct" DOUBLE PRECISION NOT NULL,
    "ramPct" DOUBLE PRECISION NOT NULL,
    "diskPct" DOUBLE PRECISION NOT NULL,
    "ramUsed" BIGINT NOT NULL,
    "ramTotal" BIGINT NOT NULL,
    "diskUsed" BIGINT NOT NULL,
    "diskTotal" BIGINT NOT NULL,
    "networkRxBps" BIGINT,
    "networkTxBps" BIGINT,
    "uptimeSec" BIGINT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" TEXT NOT NULL,
    "dockerId" TEXT,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'STOPPED',
    "sourceType" "ContainerSourceType" NOT NULL DEFAULT 'MANUAL',
    "deployMode" "ContainerDeployMode",
    "serverId" TEXT NOT NULL,
    "ports" JSONB NOT NULL DEFAULT '[]',
    "envVars" JSONB NOT NULL DEFAULT '[]',
    "volumes" JSONB NOT NULL DEFAULT '[]',
    "labels" JSONB NOT NULL DEFAULT '{}',
    "restartPolicy" TEXT NOT NULL DEFAULT 'unless-stopped',
    "cpuUsage" TEXT,
    "ramUsage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "container_deployment_sources" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "projectName" TEXT,
    "gitProviderId" TEXT,
    "repoUrl" TEXT,
    "repoBranch" TEXT,
    "repoVisibility" "RepositoryVisibility",
    "buildType" TEXT,
    "buildPath" TEXT,
    "startCommand" TEXT,
    "portOverride" TEXT,
    "publishDirectory" TEXT,
    "imageTag" TEXT,
    "accessTokenEnc" TEXT,
    "composeEnvOverrides" JSONB,
    "projectPath" TEXT,
    "composeFilePath" TEXT,
    "dockerfilePath" TEXT,
    "dockerContextPath" TEXT,
    "deploymentPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "container_deployment_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driver" TEXT NOT NULL DEFAULT 'bridge',
    "scope" TEXT NOT NULL DEFAULT 'local',
    "subnet" TEXT,
    "gateway" TEXT,
    "containers" INTEGER NOT NULL DEFAULT 0,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firewall_rule_presets" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'IN',
    "source" TEXT NOT NULL DEFAULT 'Anywhere',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firewall_rule_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DnsType" NOT NULL DEFAULT 'A',
    "value" TEXT NOT NULL,
    "serverId" TEXT,
    "targetContainerId" TEXT,
    "targetPort" INTEGER,
    "proxy" "ProxyType" NOT NULL DEFAULT 'NONE',
    "discoverySource" "DomainDiscoverySource" NOT NULL DEFAULT 'MANUAL',
    "sslEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ssl_certs" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT 'Let''s Encrypt',
    "certPem" TEXT,
    "keyPem" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "SslStatus" NOT NULL DEFAULT 'PENDING',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssl_certs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "serverId" TEXT,
    "action" TEXT NOT NULL,
    "category" "LogCategory" NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_installs" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "containerName" TEXT,
    "port" TEXT,
    "status" "AppInstallStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_installs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BackupType" NOT NULL,
    "databaseEngine" "DatabaseEngine",
    "serverId" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'Local',
    "sizeMb" DOUBLE PRECISION,
    "filePath" TEXT,
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_activeOrganizationId_idx" ON "users"("activeOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_createdById_idx" ON "organizations"("createdById");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "user_notification_providers_userId_organizationId_type_idx" ON "user_notification_providers"("userId", "organizationId", "type");

-- CreateIndex
CREATE INDEX "user_notification_providers_organizationId_idx" ON "user_notification_providers"("organizationId");

-- CreateIndex
CREATE INDEX "user_integrations_userId_idx" ON "user_integrations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_integrations_userId_provider_key" ON "user_integrations"("userId", "provider");

-- CreateIndex
CREATE INDEX "user_storage_destinations_userId_organizationId_idx" ON "user_storage_destinations"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "user_storage_destinations_organizationId_serverId_idx" ON "user_storage_destinations"("organizationId", "serverId");

-- CreateIndex
CREATE INDEX "user_git_providers_userId_organizationId_provider_idx" ON "user_git_providers"("userId", "organizationId", "provider");

-- CreateIndex
CREATE INDEX "user_git_providers_organizationId_idx" ON "user_git_providers"("organizationId");

-- CreateIndex
CREATE INDEX "user_server_access_serverId_idx" ON "user_server_access"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "user_server_access_userId_serverId_key" ON "user_server_access"("userId", "serverId");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_tokenHash_key" ON "user_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX "user_invitations_expiresAt_idx" ON "user_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "user_invitations_organizationId_idx" ON "user_invitations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- CreateIndex
CREATE INDEX "servers_organizationId_idx" ON "servers"("organizationId");

-- CreateIndex
CREATE INDEX "server_metrics_serverId_recordedAt_idx" ON "server_metrics"("serverId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "container_deployment_sources_containerId_key" ON "container_deployment_sources"("containerId");

-- CreateIndex
CREATE INDEX "container_deployment_sources_gitProviderId_idx" ON "container_deployment_sources"("gitProviderId");

-- CreateIndex
CREATE INDEX "networks_serverId_idx" ON "networks"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "networks_serverId_name_key" ON "networks"("serverId", "name");

-- CreateIndex
CREATE INDEX "firewall_rule_presets_serverId_idx" ON "firewall_rule_presets"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "firewall_rule_presets_serverId_rule_action_direction_source_key" ON "firewall_rule_presets"("serverId", "rule", "action", "direction", "source");

-- CreateIndex
CREATE UNIQUE INDEX "domains_name_key" ON "domains"("name");

-- CreateIndex
CREATE INDEX "domains_organizationId_idx" ON "domains"("organizationId");

-- CreateIndex
CREATE INDEX "domains_targetContainerId_idx" ON "domains"("targetContainerId");

-- CreateIndex
CREATE UNIQUE INDEX "ssl_certs_domainId_key" ON "ssl_certs"("domainId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_serverId_idx" ON "audit_logs"("serverId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeOrganizationId_fkey" FOREIGN KEY ("activeOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_providers" ADD CONSTRAINT "user_notification_providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_storage_destinations" ADD CONSTRAINT "user_storage_destinations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_storage_destinations" ADD CONSTRAINT "user_storage_destinations_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_git_providers" ADD CONSTRAINT "user_git_providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_server_access" ADD CONSTRAINT "user_server_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_server_access" ADD CONSTRAINT "user_server_access_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_metrics" ADD CONSTRAINT "server_metrics_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container_deployment_sources" ADD CONSTRAINT "container_deployment_sources_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container_deployment_sources" ADD CONSTRAINT "container_deployment_sources_gitProviderId_fkey" FOREIGN KEY ("gitProviderId") REFERENCES "user_git_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networks" ADD CONSTRAINT "networks_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firewall_rule_presets" ADD CONSTRAINT "firewall_rule_presets_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_targetContainerId_fkey" FOREIGN KEY ("targetContainerId") REFERENCES "containers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssl_certs" ADD CONSTRAINT "ssl_certs_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_installs" ADD CONSTRAINT "app_installs_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

