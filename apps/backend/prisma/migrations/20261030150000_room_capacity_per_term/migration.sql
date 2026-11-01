-- F11-1: base beds, extra beds and availability are set per room and term.
-- The former room-wide bed count becomes the base beds of every term the room
-- was available in; rooms were unavailable wherever no row existed.
BEGIN;

ALTER TABLE "room_term_availability"
  ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "baseBeds" INTEGER,
  ADD COLUMN "extraBeds" INTEGER NOT NULL DEFAULT 0;

UPDATE "room_term_availability" a
SET "baseBeds" = r."bedCount"
FROM "room" r
WHERE r."id" = a."roomId";

ALTER TABLE "room_term_availability" ALTER COLUMN "baseBeds" SET NOT NULL;

ALTER TABLE "room" DROP CONSTRAINT "room_bed_count_chk";
ALTER TABLE "room" DROP COLUMN "bedCount";

ALTER TABLE "room_term_availability"
  ADD CONSTRAINT "room_term_availability_base_beds_chk" CHECK ("baseBeds" >= 0),
  ADD CONSTRAINT "room_term_availability_extra_beds_chk" CHECK ("extraBeds" >= 0);

COMMIT;
