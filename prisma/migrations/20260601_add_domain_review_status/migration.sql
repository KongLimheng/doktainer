CREATE TYPE "DomainReviewStatus" AS ENUM ('CONFIRMED', 'NEEDS_REVIEW');

ALTER TABLE "domains"
  ADD COLUMN "reviewStatus" "DomainReviewStatus" NOT NULL DEFAULT 'CONFIRMED';