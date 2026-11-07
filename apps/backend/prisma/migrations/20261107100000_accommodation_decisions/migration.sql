-- S3-02: decisions on participation (bulk and individual) with an immutable
-- audit record, and the result event prepared for the participant e-mail.

-- CreateEnum
CREATE TYPE "accommodation_decision_kind" AS ENUM ('bulk', 'individual');

-- CreateTable
CREATE TABLE "accommodation_decision" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "submissionKey" UUID NOT NULL,
    "kind" "accommodation_decision_kind" NOT NULL,
    "runId" UUID,
    "actorId" TEXT NOT NULL,
    "fromStatus" "participation_status" NOT NULL,
    "toStatus" "participation_status" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodation_decision_pkey" PRIMARY KEY ("id"),
    -- A decision moves an undecided person to confirmed or waitlisted.
    CONSTRAINT "accommodation_decision_move_chk" CHECK (
        "fromStatus" IN ('pending', 'waitlisted')
        AND "toStatus" IN ('confirmed', 'waitlisted')
        AND "fromStatus" <> "toStatus"
    ),
    -- Only a bulk confirmation points to a proposal, and always to one.
    CONSTRAINT "accommodation_decision_run_chk" CHECK (("kind" = 'bulk') = ("runId" IS NOT NULL))
);

-- CreateTable
CREATE TABLE "registration_result_event" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_result_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_decision_submissionKey_registrationId_key" ON "accommodation_decision"("submissionKey", "registrationId");
CREATE INDEX "accommodation_decision_registrationId_createdAt_idx" ON "accommodation_decision"("registrationId", "createdAt");
CREATE INDEX "accommodation_decision_termId_createdAt_idx" ON "accommodation_decision"("termId", "createdAt");
CREATE UNIQUE INDEX "registration_result_event_batchId_registrationId_key" ON "registration_result_event"("batchId", "registrationId");
CREATE INDEX "registration_result_event_createdAt_idx" ON "registration_result_event"("createdAt");

-- AddForeignKey
ALTER TABLE "accommodation_decision" ADD CONSTRAINT "accommodation_decision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accommodation_decision" ADD CONSTRAINT "accommodation_decision_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accommodation_decision" ADD CONSTRAINT "accommodation_decision_registrationId_eventId_fkey" FOREIGN KEY ("registrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accommodation_decision" ADD CONSTRAINT "accommodation_decision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_result_event" ADD CONSTRAINT "registration_result_event_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_result_event" ADD CONSTRAINT "registration_result_event_registrationId_eventId_fkey" FOREIGN KEY ("registrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The decision record is never edited or deleted (F39-1).
CREATE TRIGGER "accommodation_decision_immutable" BEFORE UPDATE OR DELETE ON "accommodation_decision"
  FOR EACH ROW EXECUTE FUNCTION "accommodation_immutable"();
