-- A determination belongs to the attribute it was made for (#485): until now
-- gender was the only hard attribute, so every existing one is a gender value.
ALTER TABLE "accommodation_manual_value" ADD COLUMN "attribute" VARCHAR(64);
UPDATE "accommodation_manual_value" SET "attribute" = 'gender';
ALTER TABLE "accommodation_manual_value" ALTER COLUMN "attribute" SET NOT NULL;
