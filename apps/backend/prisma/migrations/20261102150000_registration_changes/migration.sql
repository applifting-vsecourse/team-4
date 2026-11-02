-- F35-2a: participant changes of an own registration, with organizer approval.

-- A released term stays as history and holds no bed.
ALTER TYPE "participation_status" ADD VALUE 'cancelled';

-- CreateEnum
CREATE TYPE "registration_change_status" AS ENUM ('pending', 'applied', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "registration" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "registration_change" (
    "id" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "status" "registration_change_status" NOT NULL,
    "proposal" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "registration_change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_change_registrationId_createdAt_idx" ON "registration_change"("registrationId", "createdAt");

-- CreateIndex
CREATE INDEX "registration_change_eventId_status_createdAt_idx" ON "registration_change"("eventId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "registration_change" ADD CONSTRAINT "registration_change_registrationId_eventId_fkey" FOREIGN KEY ("registrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One request waits for the organizer per registration.
CREATE UNIQUE INDEX "registration_change_one_pending_idx" ON "registration_change"("registrationId") WHERE "status" = 'pending';

-- A decided change carries its decision time; a pending one does not.
ALTER TABLE "registration_change" ADD CONSTRAINT "registration_change_decided_chk" CHECK (("status" = 'pending') = ("decidedAt" IS NULL));
