-- Optional profile of a participant account (S4-08). NULL is "not filled in".
ALTER TABLE "participant_account" ADD COLUMN "firstName" VARCHAR(100),
ADD COLUMN "lastName" VARCHAR(100),
ADD COLUMN "phone" VARCHAR(16);

-- An empty value is stored as NULL, and a phone only in E.164.
ALTER TABLE "participant_account"
ADD CONSTRAINT "participant_account_firstName_check" CHECK ("firstName" IS NULL OR btrim("firstName") <> ''),
ADD CONSTRAINT "participant_account_lastName_check" CHECK ("lastName" IS NULL OR btrim("lastName") <> ''),
ADD CONSTRAINT "participant_account_phone_check" CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{6,14}$');
