-- F65: programme of a term. Start is Europe/Prague wall-clock time.
BEGIN;

CREATE TABLE "programme_item" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "startDate" DATE NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "place" VARCHAR(200),
    "description" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "programme_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "programme_item_termId_startDate_startTime_idx" ON "programme_item"("termId", "startDate", "startTime");

ALTER TABLE "programme_item" ADD CONSTRAINT "programme_item_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "programme_item" ADD CONSTRAINT "programme_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "programme_item"
  ADD CONSTRAINT "programme_item_title_chk" CHECK (btrim("title") <> ''),
  ADD CONSTRAINT "programme_item_start_time_chk" CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

COMMIT;
