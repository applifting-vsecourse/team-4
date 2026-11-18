# ADR-0004: Read participant notifications from saved events

- **Status:** Proposed
- **Proposed:** 2026-11-18
- **Deciders:** tech lead (`rmnskb`)
- **Related:** #321, #348, #349

## Context

The participant portal shows Oznámení: the organizer's decisions on the terms
of the participant's own registrations, decided change requests and received
payments, newest first, each unread until opened and hideable for good.

Each of these events is already saved once, in its own transaction:

- an organizer decision as `registration_result_event`, one row per decision
  and registration, with the decided terms in its payload;
- a decided change request as `registration_change` with status `approved` or
  `rejected` and its frozen summary;
- a received payment as `payment`, one row per payment whatever its source
  (organizer entry, QR link, paired bank transfer); an unpaired transaction has
  no row.

The participant e-mail queue (`email_delivery`) also describes these events,
but decision e-mails are queued later by a poller, a message that cannot be
built keeps no payload, and its rows belong to e-mail distribution.

## Decision

We read the notifications from those three tables when the participant asks
for them, filtered by `registration.participantAccountId` of the session's
account. The id of a notification is the id of its source row (uuid v7,
unique across the tables).

We store only what the participant did with a notification, in
`participant_notification_state` (account, source id, `readAt`,
`dismissedAt`). No row means unread and shown; a dismissed notification is
also read (CHECK). The table is the only write of the feature.

A new kind of notification is added by reading its saved event in
`ParticipantNotificationsRepository`, not by writing notification rows from
other modules' transactions.

## Alternatives considered

- **A notification table written in each event's transaction:** six write
  paths (decisions, approval, rejection, organizer payments, QR payments, bank
  pairing) would change, including payment transactions; existing events would
  need a backfill from JSON payloads; a future write path could forget it.
- **Reading the e-mail queue:** decisions appear only after the poller,
  failed messages have no payload, and notifications would depend on e-mail
  distribution.

## Consequences

- No existing write path changes; events saved before the release appear too.
- Every saved event is listed once, so there is nothing to deduplicate.
- Reading joins three tables per request. A participant has a few
  registrations, so this is cheap; if lists grow large, add paging or
  materialize the notifications and revisit this decision.
- A notification's content comes from the frozen payloads or immutable rows,
  so it shows the event as it was saved.
