-- #389: the organizer ranks the soft preferences of the room proposal and
-- sets the neutral answers of each soft attribute (phase 2 §5, §5.4).

-- AlterTable
ALTER TABLE "accommodation_rules" ALTER COLUMN "softAttributes" SET DEFAULT ARRAY['roommate-wishes']::VARCHAR(64)[],
ADD COLUMN     "softNeutralValues" JSONB NOT NULL DEFAULT '{}';

-- Nothing could set the list before, so an empty one is the default of an
-- event that has rules for its hard attribute: only "Přání".
UPDATE "accommodation_rules" SET "softAttributes" = ARRAY['roommate-wishes']::VARCHAR(64)[]
  WHERE "softAttributes" IS NULL OR cardinality("softAttributes") = 0;

ALTER TABLE "accommodation_rules"
  ADD CONSTRAINT "accommodation_rules_soft_neutral_values_chk" CHECK (jsonb_typeof("softNeutralValues") = 'object');
