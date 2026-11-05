-- S3-T4: accommodation evaluation (S3-T3 spec v4 §9): rules, manual
-- determinations, term orders, interventions and runs.

-- CreateEnum
CREATE TYPE "accommodation_intervention_kind" AS ENUM ('position', 'manual_value');

-- CreateEnum
CREATE TYPE "accommodation_run_status" AS ENUM ('solved', 'infeasible', 'timeout', 'failed');

-- CreateTable
CREATE TABLE "accommodation_rules" (
    "eventId" UUID NOT NULL,
    "hardAttribute" VARCHAR(64),
    "nonDeterminingValues" VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR(100)[],
    "softAttributes" VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR(64)[],
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accommodation_rules_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "accommodation_manual_value" (
    "registrationId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "basedOnAnswer" VARCHAR(100),
    "reason" VARCHAR(500) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodation_manual_value_pkey" PRIMARY KEY ("registrationId")
);

-- CreateTable
CREATE TABLE "accommodation_term_order" (
    "termId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "registrationIds" UUID[],
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accommodation_term_order_pkey" PRIMARY KEY ("termId")
);

-- CreateTable
CREATE TABLE "accommodation_intervention" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "termId" UUID,
    "registrationId" UUID NOT NULL,
    "kind" "accommodation_intervention_kind" NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodation_intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_run" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "status" "accommodation_run_status" NOT NULL,
    "triggeredById" TEXT,
    "solverVersion" VARCHAR(64) NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "finishedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accommodation_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accommodation_manual_value_eventId_idx" ON "accommodation_manual_value"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_manual_value_registrationId_eventId_key" ON "accommodation_manual_value"("registrationId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_term_order_termId_eventId_key" ON "accommodation_term_order"("termId", "eventId");

-- CreateIndex
CREATE INDEX "accommodation_intervention_eventId_createdAt_idx" ON "accommodation_intervention"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "accommodation_run_termId_startedAt_idx" ON "accommodation_run"("termId", "startedAt");

-- AddForeignKey
ALTER TABLE "accommodation_rules" ADD CONSTRAINT "accommodation_rules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_manual_value" ADD CONSTRAINT "accommodation_manual_value_registrationId_eventId_fkey" FOREIGN KEY ("registrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_manual_value" ADD CONSTRAINT "accommodation_manual_value_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_term_order" ADD CONSTRAINT "accommodation_term_order_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_intervention" ADD CONSTRAINT "accommodation_intervention_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_intervention" ADD CONSTRAINT "accommodation_intervention_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_intervention" ADD CONSTRAINT "accommodation_intervention_registrationId_eventId_fkey" FOREIGN KEY ("registrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_intervention" ADD CONSTRAINT "accommodation_intervention_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_run" ADD CONSTRAINT "accommodation_run_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_run" ADD CONSTRAINT "accommodation_run_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_run" ADD CONSTRAINT "accommodation_run_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A determination and an intervention always say why.
ALTER TABLE "accommodation_manual_value" ADD CONSTRAINT "accommodation_manual_value_reason_chk" CHECK (btrim("reason") <> ''),
  ADD CONSTRAINT "accommodation_manual_value_value_chk" CHECK (btrim("value") <> '');
ALTER TABLE "accommodation_intervention" ADD CONSTRAINT "accommodation_intervention_reason_chk" CHECK (btrim("reason") <> '');

-- A position change belongs to a term; a determination applies to all terms.
ALTER TABLE "accommodation_intervention" ADD CONSTRAINT "accommodation_intervention_term_chk" CHECK (("kind" = 'position') = ("termId" IS NOT NULL));

-- A run has a proposal unless it failed, and a failed one says why.
ALTER TABLE "accommodation_run" ADD CONSTRAINT "accommodation_run_result_chk" CHECK (("status" = 'failed') = ("result" IS NULL) AND ("status" = 'failed') = ("error" IS NOT NULL)),
  ADD CONSTRAINT "accommodation_run_time_chk" CHECK ("finishedAt" >= "startedAt");

-- Runs and interventions are the evidence of a proposal and an order (F39-1):
-- they are never changed or removed.
CREATE FUNCTION "accommodation_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

CREATE TRIGGER "accommodation_run_immutable" BEFORE UPDATE OR DELETE ON "accommodation_run"
  FOR EACH ROW EXECUTE FUNCTION "accommodation_immutable"();

CREATE TRIGGER "accommodation_intervention_immutable" BEFORE UPDATE OR DELETE ON "accommodation_intervention"
  FOR EACH ROW EXECUTE FUNCTION "accommodation_immutable"();
