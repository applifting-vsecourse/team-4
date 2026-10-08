-- AlterTable
ALTER TABLE "account" ADD COLUMN     "issuer" TEXT;

-- better-auth 1.7 stamps `issuer` on credential accounts and matches on it when
-- signing in. Existing rows predate the column, so backfill them or every
-- account created before this upgrade would silently fail to log in.
UPDATE "account" SET "issuer" = 'local:credential'
WHERE "providerId" = 'credential' AND "issuer" IS NULL;
