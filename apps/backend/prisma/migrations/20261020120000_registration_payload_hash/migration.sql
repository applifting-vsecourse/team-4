-- S2-08: a retry with the same submissionKey must carry the same submission
-- (data-model.md §3.7). The hash of the normalized submission tells a lost
-- response from a reused key with changed content.

ALTER TABLE "registration" ADD COLUMN "payloadHash" CHAR(64);

-- Rows written before were never submitted through the API, so no client can
-- retry them; any well-formed value keeps them consistent.
UPDATE "registration"
SET "payloadHash" = encode(sha256(convert_to("submissionKey"::text, 'UTF8')), 'hex');

ALTER TABLE "registration" ALTER COLUMN "payloadHash" SET NOT NULL;
