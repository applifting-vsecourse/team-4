-- F65-1: a programme item has an end time (Europe/Prague wall-clock, same day
-- as the start). Existing items get a one-hour length, cut off at the day end.
BEGIN;

ALTER TABLE "programme_item" ADD COLUMN "endTime" VARCHAR(5);

UPDATE "programme_item"
SET "startTime" = CASE WHEN "startTime" = '23:59' THEN '23:58' ELSE "startTime" END;

UPDATE "programme_item"
SET "endTime" = CASE
  WHEN "startTime" >= '23:00' THEN '23:59'
  ELSE to_char(("startTime"::time + interval '1 hour'), 'HH24:MI')
END;

ALTER TABLE "programme_item" ALTER COLUMN "endTime" SET NOT NULL;

ALTER TABLE "programme_item"
  ADD CONSTRAINT "programme_item_end_time_format_chk" CHECK ("endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "programme_item_end_after_start_chk" CHECK ("endTime" > "startTime");

COMMIT;
