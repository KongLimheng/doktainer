-- Project-centric deployment foundation
-- Adds projects and environments under organizations, while keeping containers backward-compatible.

CREATE TYPE "EnvironmentKind" AS ENUM (
  'PRODUCTION',
  'STAGING',
  'DEVELOPMENT',
  'PREVIEW',
  'CUSTOM'
);

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "environments" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "kind" "EnvironmentKind" NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "containers"
ADD COLUMN "environmentId" TEXT;

CREATE UNIQUE INDEX "projects_organizationId_slug_key"
ON "projects"("organizationId", "slug");

CREATE INDEX "projects_organizationId_idx"
ON "projects"("organizationId");

CREATE UNIQUE INDEX "environments_projectId_slug_key"
ON "environments"("projectId", "slug");

CREATE INDEX "environments_projectId_idx"
ON "environments"("projectId");

CREATE INDEX "environments_projectId_kind_idx"
ON "environments"("projectId", "kind");

CREATE INDEX "environments_serverId_idx"
ON "environments"("serverId");

CREATE INDEX "containers_environmentId_idx"
ON "containers"("environmentId");

CREATE INDEX "containers_serverId_idx"
ON "containers"("serverId");

ALTER TABLE "projects"
ADD CONSTRAINT "projects_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "environments"
ADD CONSTRAINT "environments_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "environments"
ADD CONSTRAINT "environments_serverId_fkey"
FOREIGN KEY ("serverId") REFERENCES "servers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "containers"
ADD CONSTRAINT "containers_environmentId_fkey"
FOREIGN KEY ("environmentId") REFERENCES "environments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;