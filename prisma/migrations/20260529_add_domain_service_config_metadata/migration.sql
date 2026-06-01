CREATE TYPE "DomainNameType" AS ENUM ('EXACT', 'WILDCARD');
CREATE TYPE "DomainConfigMode" AS ENUM ('SHARED', 'ISOLATED');

ALTER TABLE "domains"
  ADD COLUMN "domainNameType" "DomainNameType" NOT NULL DEFAULT 'EXACT',
  ADD COLUMN "configMode" "DomainConfigMode" NOT NULL DEFAULT 'SHARED',
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

UPDATE "domains"
SET "domainNameType" = 'WILDCARD'
WHERE "name" LIKE '*.%';

UPDATE "domains"
SET "configMode" = 'ISOLATED'
WHERE "proxy" <> 'NGINX';
