-- F64: the participant's own words for "Jiná odpověď" (gender = 'other').
-- Voluntary; every other answer, and no answer, has none.

-- AlterTable
ALTER TABLE "registration" ADD COLUMN "genderOther" VARCHAR(100);

ALTER TABLE "registration"
  ADD CONSTRAINT "registration_gender_other_chk" CHECK ("genderOther" IS NULL OR "gender" = 'other');
