-- F45-1: decisions saved before participant e-mails existed are not mailed
-- afterwards. Each gets a failed delivery that says so, which is also the
-- mark that stops the scan from picking it up.
INSERT INTO "email_delivery"
  ("id", "type", "status", "recipientEmail", "registrationId",
   "participantAccountId", "dedupKey", "errorMessage", "updatedAt")
SELECT gen_random_uuid(), 'participant_update', 'failed', r."email", r."id",
       r."participantAccountId", 'result:' || e."id"::text,
       'Not sent: decided before participant e-mails (F45-1)', now()
FROM "registration_result_event" e
JOIN "registration" r ON r."id" = e."registrationId"
ON CONFLICT ("dedupKey") DO NOTHING;
