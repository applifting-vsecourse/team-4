-- Categorical questions of the registration form (#485): an event has up to
-- five, each with 2–10 options and one answer per registration. Their ids
-- are the attributes and values of the accommodation rules.

-- CreateTable
CREATE TABLE "registration_question" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "isRequired" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "registration_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_question_option" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,

    CONSTRAINT "registration_question_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_answer" (
    "registrationId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "answeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_answer_pkey" PRIMARY KEY ("registrationId","questionId")
);

-- CreateIndex
CREATE INDEX "registration_question_eventId_position_idx" ON "registration_question"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "registration_question_id_eventId_key" ON "registration_question"("id", "eventId");

-- CreateIndex
CREATE INDEX "registration_question_option_questionId_position_idx" ON "registration_question_option"("questionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "registration_question_option_id_questionId_key" ON "registration_question_option"("id", "questionId");

-- CreateIndex
CREATE INDEX "registration_answer_questionId_idx" ON "registration_answer"("questionId");

-- CreateIndex
CREATE INDEX "registration_answer_optionId_questionId_idx" ON "registration_answer"("optionId", "questionId");

-- AddForeignKey
ALTER TABLE "registration_question" ADD CONSTRAINT "registration_question_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_question_option" ADD CONSTRAINT "registration_question_option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "registration_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_answer" ADD CONSTRAINT "registration_answer_registrationId_eventId_fkey" FOREIGN KEY ("registrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_answer" ADD CONSTRAINT "registration_answer_questionId_eventId_fkey" FOREIGN KEY ("questionId", "eventId") REFERENCES "registration_question"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_answer" ADD CONSTRAINT "registration_answer_optionId_questionId_fkey" FOREIGN KEY ("optionId", "questionId") REFERENCES "registration_question_option"("id", "questionId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Labels are never blank, and positions start at 0.
ALTER TABLE "registration_question"
  ADD CONSTRAINT "registration_question_label_chk" CHECK (btrim("label") <> ''),
  ADD CONSTRAINT "registration_question_position_chk" CHECK ("position" >= 0);
ALTER TABLE "registration_question_option"
  ADD CONSTRAINT "registration_question_option_label_chk" CHECK (btrim("label") <> ''),
  ADD CONSTRAINT "registration_question_option_position_chk" CHECK ("position" >= 0);
