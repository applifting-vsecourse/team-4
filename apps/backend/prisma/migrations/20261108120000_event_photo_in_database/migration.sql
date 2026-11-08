-- Photos are stored in the database instead of object storage. Rows written
-- against object storage have no bytes to migrate, so they are dropped.
DELETE FROM "event_photo";

DROP INDEX "event_photo_objectKey_key";
ALTER TABLE "event_photo" DROP COLUMN "objectKey",
ADD COLUMN "data" BYTEA NOT NULL;
