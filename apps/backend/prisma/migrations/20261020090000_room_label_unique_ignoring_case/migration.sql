-- S2-05: a room label is unique per event, ignoring case and outer spaces. The
-- statements below are hand-written, Prisma cannot express the index.

-- Rooms that would collide are reported, never merged, renamed or deleted
-- (the PM decides). The migration stops here until they are resolved.
DO $$
DECLARE
  clashes TEXT;
BEGIN
  SELECT string_agg(
           format('event %s: "%s"', "eventId", "label"), '; ' ORDER BY "eventId", "label")
  INTO clashes
  FROM "room"
  WHERE (("eventId", lower(btrim("label")))) IN (
    SELECT "eventId", lower(btrim("label"))
    FROM "room"
    GROUP BY "eventId", lower(btrim("label"))
    HAVING count(*) > 1
  );
  IF clashes IS NOT NULL THEN
    RAISE EXCEPTION 'Rooms with clashing labels, resolve them first: %', clashes;
  END IF;
END $$;

-- Stored labels are trimmed (only outer spaces differ from the previous rule).
UPDATE "room" SET "label" = btrim("label") WHERE "label" <> btrim("label");

ALTER TABLE "room"
  ADD CONSTRAINT "room_label_trimmed_chk"
  CHECK ("label" <> '' AND "label" = btrim("label"));

-- DropIndex
DROP INDEX "room_eventId_label_key";

-- Race-safe: concurrent creates of "Pokoj 1" / "pokoj 1" cannot both succeed.
CREATE UNIQUE INDEX "room_event_label_key"
  ON "room" ("eventId", lower("label"));
