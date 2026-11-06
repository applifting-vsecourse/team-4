-- F45-1: e-mails about saved changes, decisions and payments of a registration.

-- AlterEnum
ALTER TYPE "email_type" ADD VALUE 'participant_update';

ALTER TYPE "email_delivery_status" ADD VALUE 'sending';

-- AlterTable
ALTER TABLE "email_delivery" ADD COLUMN     "dedupKey" VARCHAR(120),
ADD COLUMN     "payload" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_dedupKey_key" ON "email_delivery"("dedupKey");
