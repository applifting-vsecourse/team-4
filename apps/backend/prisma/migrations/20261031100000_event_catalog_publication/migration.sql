-- F54-1: manual listing in the public catalog; new and existing events start unpublished.
ALTER TABLE "event" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
