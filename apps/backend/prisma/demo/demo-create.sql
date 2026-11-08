-- akc.io demo data for Sprint Review 3 (S3-T5): creates or resets the demo set.
--
-- Run the whole file in one go (Adminer: SQL command). It first removes any
-- previous demo set (the same steps as demo-delete.sql), then creates it
-- again, all in one transaction: every run starts the demo from the same
-- state, and a failure leaves the database as it was. Dates are relative to
-- the day of the run, so the terms always lie ahead.
--
-- Organizer: Alena Pořadatelová, team4vse@seznam.cz / akcio-demo-2026
-- Participant with a mailbox (magic link): Jana Nováková, team4vse@seznam.cz
-- Everyone else is fictional (@example.com) and cannot sign in.

BEGIN;

-- ─── 1. Remove the previous demo set (kept in sync with demo-delete.sql) ────

DO $$
DECLARE
  v_owner text;
  v_orgs uuid[];
  v_events uuid[];
  v_regs uuid[];
  v_accounts uuid[];
BEGIN
  -- The mailbox is shared: an account with the same e-mail that the demo
  -- did not create is never deleted; the run stops instead.
  IF EXISTS (
    SELECT 1 FROM "user"
    WHERE email = 'team4vse@seznam.cz' AND id <> 'akcio-demo-organizer'
  ) THEN
    RAISE EXCEPTION 'team4vse@seznam.cz belongs to an account the demo did not create; nothing was changed.';
  END IF;

  SELECT id INTO v_owner FROM "user" WHERE id = 'akcio-demo-organizer';
  IF v_owner IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_orgs
    FROM organization WHERE "ownerId" = v_owner;
  SELECT coalesce(array_agg(id), '{}') INTO v_events
    FROM event WHERE "organizationId" = ANY (v_orgs);
  SELECT coalesce(array_agg(id), '{}') INTO v_regs
    FROM registration WHERE "eventId" = ANY (v_events);
  SELECT coalesce(array_agg(DISTINCT "participantAccountId"), '{}') INTO v_accounts
    FROM registration WHERE id = ANY (v_regs);

  ALTER TABLE accommodation_run DISABLE TRIGGER accommodation_run_immutable;
  ALTER TABLE accommodation_intervention DISABLE TRIGGER accommodation_intervention_immutable;
  ALTER TABLE accommodation_decision DISABLE TRIGGER accommodation_decision_immutable;
  DELETE FROM accommodation_run WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_intervention WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_decision WHERE "eventId" = ANY (v_events);
  ALTER TABLE accommodation_run ENABLE TRIGGER accommodation_run_immutable;
  ALTER TABLE accommodation_intervention ENABLE TRIGGER accommodation_intervention_immutable;
  ALTER TABLE accommodation_decision ENABLE TRIGGER accommodation_decision_immutable;
  DELETE FROM registration_result_event WHERE "eventId" = ANY (v_events);

  DELETE FROM accommodation_manual_value WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_term_state WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_term_order WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_rules WHERE "eventId" = ANY (v_events);

  DELETE FROM email_delivery WHERE "registrationId" = ANY (v_regs);
  DELETE FROM payment WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration_change WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration_term WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration WHERE id = ANY (v_regs);

  DELETE FROM programme_item WHERE "eventId" = ANY (v_events);
  DELETE FROM room_term_availability WHERE "eventId" = ANY (v_events);
  DELETE FROM room WHERE "eventId" = ANY (v_events);
  DELETE FROM event_photo WHERE "eventId" = ANY (v_events);
  DELETE FROM event_term WHERE "eventId" = ANY (v_events);
  DELETE FROM event WHERE id = ANY (v_events);

  DELETE FROM organization_member
    WHERE "organizationId" = ANY (v_orgs) OR "userId" = v_owner;
  DELETE FROM organization WHERE id = ANY (v_orgs);

  SELECT coalesce(array_agg(a.id), '{}') INTO v_accounts
    FROM participant_account a
    WHERE a.id = ANY (v_accounts)
      AND NOT EXISTS (
        SELECT 1 FROM registration r WHERE r."participantAccountId" = a.id
      );
  DELETE FROM email_delivery WHERE "participantAccountId" = ANY (v_accounts);
  DELETE FROM participant_account WHERE id = ANY (v_accounts);

  DELETE FROM verification WHERE identifier LIKE 'reset-password:%'
    AND value = v_owner;
  DELETE FROM "user" WHERE id = v_owner;
END $$;

-- ─── 2. Helper: one registration with its terms and payments ────────────────
-- A session-local function (pg_temp), gone when the connection closes.

CREATE OR REPLACE FUNCTION pg_temp.demo_registration(
  p_event uuid,
  p_first text,
  p_last text,
  p_email text,
  p_phone text,
  p_gender gender,
  p_received timestamptz,
  p_terms jsonb,              -- {"<termId>": "confirmed" | "pending" | "waitlisted"}
  p_payments int[] DEFAULT '{}',
  p_diet diet_choice[] DEFAULT '{}',
  p_health text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql AS $fn$
DECLARE
  v_id uuid := gen_random_uuid();
  v_ev event%ROWTYPE;
  v_owner text;
  v_account uuid;
  v_due int;
  v_has_bank boolean;
  v_i int;
BEGIN
  SELECT * INTO v_ev FROM event WHERE id = p_event;
  SELECT "ownerId" INTO v_owner FROM organization WHERE id = v_ev."organizationId";
  v_has_bank := v_ev."bankAccountNumber" IS NOT NULL;

  INSERT INTO participant_account (id, email)
    VALUES (gen_random_uuid(), lower(p_email))
    ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_account FROM participant_account WHERE email = lower(p_email);

  SELECT coalesce(sum(t."priceMinor"), 0) INTO v_due
    FROM jsonb_each_text(p_terms) j
    JOIN event_term t ON t.id = j.key::uuid
    WHERE j.value = 'confirmed';

  INSERT INTO registration (
    id, "organizationId", "eventId", "participantAccountId", "submissionKey",
    "payloadHash", "firstName", "lastName", email, phone, gender, "receivedAt",
    "paymentReminderAt", "hasNoDietRestriction", diet, health,
    "bankAccountPrefix", "bankAccountNumber", "bankCode", "paymentReminderDays"
  ) VALUES (
    v_id, v_ev."organizationId", p_event, v_account, gen_random_uuid(),
    encode(sha256(convert_to(v_id::text, 'UTF8')), 'hex'),
    p_first, p_last, p_email, p_phone, p_gender, p_received,
    CASE WHEN v_has_bank AND v_due > 0
      THEN p_received + make_interval(days => v_ev."paymentReminderDays") END,
    cardinality(p_diet) = 0, p_diet, p_health,
    v_ev."bankAccountPrefix", v_ev."bankAccountNumber", v_ev."bankCode",
    CASE WHEN v_has_bank THEN v_ev."paymentReminderDays" END
  );

  INSERT INTO registration_term
    ("registrationId", "termId", "eventId", status, "priceMinor", "decidedAt")
  SELECT v_id, t.id, p_event, j.value::participation_status, t."priceMinor", p_received
    FROM jsonb_each_text(p_terms) j
    JOIN event_term t ON t.id = j.key::uuid;

  FOR v_i IN 1 .. coalesce(array_length(p_payments, 1), 0) LOOP
    INSERT INTO payment (
      id, "organizationId", "registrationId", "submissionKey", "amountMinor",
      "receivedOn", source, "recordedById"
    ) VALUES (
      gen_random_uuid(), v_ev."organizationId", v_id, gen_random_uuid(),
      p_payments[v_i], least((p_received + make_interval(days => 3 * v_i))::date, current_date),
      'organizer', v_owner
    );
  END LOOP;

  RETURN v_id;
END $fn$;

-- ─── 3. The demo set ─────────────────────────────────────────────────────────

DO $$
DECLARE
  -- Monday of the current week; terms are placed relative to it.
  w date := date_trunc('week', current_date)::date;
  now_ts timestamptz := now();
  v_owner text := 'akcio-demo-organizer';
  v_org uuid := gen_random_uuid();

  -- Events
  e_camp uuid := gen_random_uuid();
  e_course uuid := gen_random_uuid();
  e_trip uuid := gen_random_uuid();
  e_cleanup uuid := gen_random_uuid();

  -- Terms
  t_camp1 uuid := gen_random_uuid();
  t_camp2 uuid := gen_random_uuid();
  t_course1 uuid := gen_random_uuid();
  t_course2 uuid := gen_random_uuid();
  t_trip uuid := gen_random_uuid();
  t_cleanup uuid := gen_random_uuid();

  -- Rooms
  r_buk uuid := gen_random_uuid();
  r_dub uuid := gen_random_uuid();
  r_javor uuid := gen_random_uuid();
  r_attic uuid := gen_random_uuid();
  r_club uuid := gen_random_uuid();

  -- Registrations referenced by changes
  reg_petr uuid;
  reg_tomas uuid;

  camp_terms jsonb;
  v_terms jsonb;
BEGIN
  -- ── Organizer and organization ──
  INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (v_owner, 'Alena Pořadatelová', 'team4vse@seznam.cz', true, now_ts, now_ts);
  -- BetterAuth credential account; password akcio-demo-2026 (scrypt).
  INSERT INTO account (id, "accountId", "providerId", issuer, "userId", password, "createdAt", "updatedAt")
    VALUES ('akcio-demo-organizer-credential', v_owner, 'credential', 'local:credential', v_owner,
      '30cd69e654286678fd6bf676d54ad723:79ff45534b1bc181e1b2399b4105719e77ac4e72930e2aedae210d913630f7a2e9892b4de3b2bbc14cc77cb6e5d0b64055e0b7219be2eb0f7a4ea26698351726',
      now_ts, now_ts);
  INSERT INTO organization (id, name, "ownerId", "updatedAt")
    VALUES (v_org, 'Spolek Jasan', v_owner, now_ts);
  INSERT INTO organization_member ("organizationId", "userId", role)
    VALUES (v_org, v_owner, 'owner');

  -- ── Events ──
  -- 1. Paid camp with gender-separated rooms (hard attribute) and two terms.
  -- 2. Paid course without a hard attribute: one queue per term.
  -- 3. Paid one-day trip with settled registrations.
  -- 4. Free draft without a bank account, ready to open registration live.
  INSERT INTO event (
    id, "organizationId", "publicId", name, description, location, status,
    "firstOpenedAt", "isPublished", "bankAccountNumber", "bankCode",
    "paymentReminderDays", "changeApprovalDays", conditions, "contactName",
    "contactEmail", "contactPhone", "createdAt", "updatedAt"
  ) VALUES
  (
    e_camp, v_org, 'jasan-tabor', 'Tábor v Jizerkách',
    'Týden v horách pro dospělé: denní výlety po hřebenech, hry v lese, večery u krbu a společné vaření. Bydlíme v dřevěných chatkách, pokoje jsou rozdělené podle pohlaví.',
    'Chatová osada Jizerka, Kořenov', 'open', now_ts - interval '30 days', true,
    '123457', '0100', 14, 30,
    'Přihláška je závazná po potvrzení účasti organizátorem. Storno do 14 dnů před začátkem bez poplatku.',
    'Alena Pořadatelová', 'team4vse@seznam.cz', '+420601234567',
    now_ts - interval '40 days', now_ts
  ),
  (
    e_course, v_org, 'jasan-kurz', 'Víkendový kurz první pomoci',
    'Dva dny praktického nácviku první pomoci s certifikovaným lektorem: resuscitace, zástava krvácení, úrazy v přírodě a modelové situace. Spí se ve společné klubovně.',
    'Klubovna Spolku Jasan, Praha 4', 'open', now_ts - interval '25 days', true,
    '123457', '0100', 14, 7,
    'Kurz je vhodný i pro úplné začátečníky. Na konci obdržíte osvědčení o absolvování.',
    'Alena Pořadatelová', 'team4vse@seznam.cz', NULL,
    now_ts - interval '35 days', now_ts
  ),
  (
    e_trip, v_org, 'jasan-snezka', 'Výstup na Sněžku',
    'Jednodenní výlet z Pece pod Sněžkou přes Obří důl na vrchol a zpět. Doprava společným autobusem z Prahy.',
    'Pec pod Sněžkou', 'open', now_ts - interval '20 days', true,
    '123457', '0100', 14, 3,
    '', 'Alena Pořadatelová', 'team4vse@seznam.cz', NULL,
    now_ts - interval '22 days', now_ts
  ),
  (
    e_cleanup, v_org, 'jasan-uklid', 'Úklid Kunratického lesa',
    'Dobrovolnická akce: společně uklidíme Kunratický les. Rukavice a pytle zajistíme, po akci opékání buřtů.',
    'Kunratický les, Praha 4', 'draft', NULL, false,
    NULL, NULL, NULL, NULL,
    '', NULL, NULL, NULL,
    now_ts - interval '5 days', now_ts
  );

  -- ── Terms ──
  INSERT INTO event_term (id, "eventId", label, "startDate", "endDate", "priceMinor", "updatedAt") VALUES
    (t_camp1, e_camp, '1. turnus', w + 28, w + 34, 450000, now_ts),
    (t_camp2, e_camp, '2. turnus', w + 35, w + 41, 480000, now_ts),
    (t_course1, e_course, 'První víkend', w + 12, w + 13, 120000, now_ts),
    (t_course2, e_course, 'Druhý víkend', w + 19, w + 20, 120000, now_ts),
    (t_trip, e_trip, 'Sobota', w + 26, w + 26, 45000, now_ts),
    (t_cleanup, e_cleanup, 'Sobotní dopoledne', w + 40, w + 40, 0, now_ts);

  -- ── Rooms and their beds per term ──
  INSERT INTO room (id, "eventId", label, "updatedAt") VALUES
    (r_buk, e_camp, 'Chatka Buk', now_ts),
    (r_dub, e_camp, 'Chatka Dub', now_ts),
    (r_javor, e_camp, 'Chatka Javor', now_ts),
    (r_attic, e_camp, 'Podkroví hlavní budovy', now_ts),
    (r_club, e_course, 'Klubovna', now_ts);
  INSERT INTO room_term_availability ("roomId", "termId", "eventId", "isAvailable", "baseBeds", "extraBeds") VALUES
    -- 1. turnus: 13 beds + 1 extra bed
    (r_buk, t_camp1, e_camp, true, 4, 0),
    (r_dub, t_camp1, e_camp, true, 4, 0),
    (r_javor, t_camp1, e_camp, true, 3, 0),
    (r_attic, t_camp1, e_camp, true, 2, 1),
    -- 2. turnus: Javor is being repaired and does not count
    (r_buk, t_camp2, e_camp, true, 4, 0),
    (r_dub, t_camp2, e_camp, true, 4, 0),
    (r_javor, t_camp2, e_camp, false, 3, 0),
    (r_attic, t_camp2, e_camp, true, 2, 1),
    -- Course: 8 places on the first weekend, 6 on the second
    (r_club, t_course1, e_course, true, 8, 0),
    (r_club, t_course2, e_course, true, 6, 0);

  -- Rooms of the camp are separated by gender; other and undisclosed answers
  -- leave the room to the organizer (manual determination).
  INSERT INTO accommodation_rules ("eventId", "hardAttribute", "nonDeterminingValues", "softAttributes", "updatedAt")
    VALUES (e_camp, 'gender', ARRAY['other', 'undisclosed'], '{}', now_ts);

  -- ── Programme of the 1st camp term (visible to confirmed participants) ──
  INSERT INTO programme_item (id, "eventId", "termId", title, "startDate", "startTime", place, description, "updatedAt") VALUES
    (gen_random_uuid(), e_camp, t_camp1, 'Příjezd a ubytování', w + 28, '15:00', 'Recepce osady', 'Klíče od chatek vydáváme do 19:00.', now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Večeře a seznámení', w + 28, '18:30', 'Jídelna', NULL, now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Výlet na Bukovec', w + 29, '09:00', 'Sraz před jídelnou', 'Celodenní túra, 14 km. S sebou svačinu a pláštěnku.', now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Hry v lese', w + 30, '10:00', 'Louka za osadou', NULL, now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Večer u krbu', w + 31, '19:30', 'Společenská místnost', 'Kytary vítány.', now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Odjezd', w + 34, '10:00', 'Recepce osady', 'Chatky prosíme vyklidit do 10:00.', now_ts);

  -- ── Camp, 1. turnus: 6 confirmed (3 women, 3 men), 12 waiting ──
  -- Jana uses the real demo mailbox: confirmed, partly paid, sees the programme.
  PERFORM pg_temp.demo_registration(e_camp, 'Jana', 'Nováková', 'team4vse@seznam.cz', '+420601000001', 'female',
    now_ts - interval '28 days', jsonb_build_object(t_camp1, 'confirmed'), ARRAY[200000], ARRAY['vegetarian']::diet_choice[]);
  -- Petr is confirmed and paid; he asks to move to the 2nd term (pending change).
  reg_petr := pg_temp.demo_registration(e_camp, 'Petr', 'Svoboda', 'petr.svoboda@example.com', '+420601000002', 'male',
    now_ts - interval '27 days 20 hours', jsonb_build_object(t_camp1, 'confirmed'), ARRAY[450000]);
  -- Eva: confirmed in the 1st term, substitute in the full 2nd term, unpaid.
  PERFORM pg_temp.demo_registration(e_camp, 'Eva', 'Dvořáková', 'eva.dvorakova@example.com', '+420601000003', 'female',
    now_ts - interval '27 days', jsonb_build_object(t_camp1, 'confirmed', t_camp2, 'waitlisted'));
  -- Tomáš is paid; he asks to change his phone number (pending change).
  reg_tomas := pg_temp.demo_registration(e_camp, 'Tomáš', 'Veselý', 'tomas.vesely@example.com', '+420601000004', 'male',
    now_ts - interval '26 days', jsonb_build_object(t_camp1, 'confirmed'), ARRAY[200000, 250000]);
  PERFORM pg_temp.demo_registration(e_camp, 'Lucie', 'Procházková', 'lucie.prochazkova@example.com', '+420601000005', 'female',
    now_ts - interval '25 days', jsonb_build_object(t_camp1, 'confirmed'), ARRAY[450000], ARRAY['gluten_free']::diet_choice[]);
  PERFORM pg_temp.demo_registration(e_camp, 'Martin', 'Černý', 'martin.cerny@example.com', '+420601000006', 'male',
    now_ts - interval '24 days', jsonb_build_object(t_camp1, 'confirmed'), ARRAY[150000]);

  camp_terms := jsonb_build_object(t_camp1, 'pending');
  PERFORM pg_temp.demo_registration(e_camp, 'Kristýna', 'Urbanová', 'kristyna.urbanova@example.com', '+420601000007', 'female',
    now_ts - interval '22 days', jsonb_build_object(t_camp1, 'waitlisted'));
  PERFORM pg_temp.demo_registration(e_camp, 'Kateřina', 'Horáková', 'katerina.horakova@example.com', '+420601000008', 'female',
    now_ts - interval '20 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Jakub', 'Fiala', 'jakub.fiala@example.com', '+420601000009', 'male',
    now_ts - interval '19 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Veronika', 'Marková', 'veronika.markova@example.com', '+420601000010', 'female',
    now_ts - interval '17 days', camp_terms, '{}', ARRAY['vegan']::diet_choice[]);
  -- Alex did not disclose gender: the organizer must decide the room.
  PERFORM pg_temp.demo_registration(e_camp, 'Alex', 'Šimek', 'alex.simek@example.com', '+420601000011', 'undisclosed',
    now_ts - interval '16 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Ondřej', 'Kučera', 'ondrej.kucera@example.com', '+420601000012', 'male',
    now_ts - interval '15 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Adéla', 'Pokorná', 'adela.pokorna@example.com', '+420601000013', 'female',
    now_ts - interval '13 days', camp_terms, '{}', '{}', 'Alergie na včelí bodnutí, mám s sebou adrenalinové pero.');
  PERFORM pg_temp.demo_registration(e_camp, 'Lukáš', 'Němec', 'lukas.nemec@example.com', '+420601000014', 'male',
    now_ts - interval '12 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Barbora', 'Králová', 'barbora.kralova@example.com', '+420601000015', 'female',
    now_ts - interval '10 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'David', 'Zeman', 'david.zeman@example.com', '+420601000016', 'male',
    now_ts - interval '8 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Tereza', 'Benešová', 'tereza.benesova@example.com', '+420601000017', 'female',
    now_ts - interval '6 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Filip', 'Růžička', 'filip.ruzicka@example.com', '+420601000018', 'male',
    now_ts - interval '4 days', camp_terms);

  -- ── Camp, 2. turnus: 2 confirmed, 3 waiting (+ Eva as substitute) ──
  camp_terms := jsonb_build_object(t_camp2, 'pending');
  PERFORM pg_temp.demo_registration(e_camp, 'Radek', 'Novotný', 'radek.novotny@example.com', '+420601000019', 'male',
    now_ts - interval '23 days', jsonb_build_object(t_camp2, 'confirmed'), ARRAY[480000]);
  PERFORM pg_temp.demo_registration(e_camp, 'Simona', 'Kolářová', 'simona.kolarova@example.com', '+420601000020', 'female',
    now_ts - interval '21 days', jsonb_build_object(t_camp2, 'confirmed'), ARRAY[100000]);
  PERFORM pg_temp.demo_registration(e_camp, 'Michaela', 'Bartošová', 'michaela.bartosova@example.com', '+420601000021', 'female',
    now_ts - interval '14 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Pavel', 'Vlček', 'pavel.vlcek@example.com', '+420601000022', 'male',
    now_ts - interval '9 days', camp_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Hana', 'Říhová', 'hana.rihova@example.com', '+420601000023', 'female',
    now_ts - interval '3 days', camp_terms);

  -- ── Course, first weekend: never evaluated, 3 confirmed, 7 waiting, 8 places ──
  PERFORM pg_temp.demo_registration(e_course, 'Ivana', 'Malá', 'ivana.mala@example.com', '+420602000001', 'female',
    now_ts - interval '24 days', jsonb_build_object(t_course1, 'confirmed'), ARRAY[120000]);
  PERFORM pg_temp.demo_registration(e_course, 'Roman', 'Sýkora', 'roman.sykora@example.com', '+420602000002', 'male',
    now_ts - interval '23 days', jsonb_build_object(t_course1, 'confirmed'));
  PERFORM pg_temp.demo_registration(e_course, 'Monika', 'Holubová', 'monika.holubova@example.com', '+420602000003', 'female',
    now_ts - interval '22 days', jsonb_build_object(t_course1, 'confirmed'), ARRAY[50000]);
  v_terms := jsonb_build_object(t_course1, 'pending');
  PERFORM pg_temp.demo_registration(e_course, 'Zuzana', 'Jelínková', 'zuzana.jelinkova@example.com', '+420602000004', 'female',
    now_ts - interval '18 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Vojtěch', 'Kratochvíl', 'vojtech.kratochvil@example.com', '+420602000005', 'male',
    now_ts - interval '16 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Klára', 'Šťastná', 'klara.stastna@example.com', '+420602000006', 'female',
    now_ts - interval '14 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Jiří', 'Navrátil', 'jiri.navratil@example.com', '+420602000007', 'male',
    now_ts - interval '11 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Markéta', 'Vaňková', 'marketa.vankova@example.com', '+420602000008', 'female',
    now_ts - interval '9 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Štěpán', 'Hájek', 'stepan.hajek@example.com', '+420602000009', 'male',
    now_ts - interval '5 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Lenka', 'Dušková', 'lenka.duskova@example.com', '+420602000010', 'female',
    now_ts - interval '2 days', v_terms);

  -- ── Course, second weekend: almost full, 5 confirmed, 2 waiting, 6 places ──
  PERFORM pg_temp.demo_registration(e_course, 'Daniel', 'Moravec', 'daniel.moravec@example.com', '+420602000011', 'male',
    now_ts - interval '21 days', jsonb_build_object(t_course2, 'confirmed'), ARRAY[120000]);
  PERFORM pg_temp.demo_registration(e_course, 'Alžběta', 'Kopecká', 'alzbeta.kopecka@example.com', '+420602000012', 'female',
    now_ts - interval '20 days', jsonb_build_object(t_course2, 'confirmed'), ARRAY[120000]);
  PERFORM pg_temp.demo_registration(e_course, 'Marek', 'Pešek', 'marek.pesek@example.com', '+420602000013', 'male',
    now_ts - interval '19 days', jsonb_build_object(t_course2, 'confirmed'), ARRAY[120000]);
  PERFORM pg_temp.demo_registration(e_course, 'Gabriela', 'Tichá', 'gabriela.ticha@example.com', '+420602000014', 'female',
    now_ts - interval '17 days', jsonb_build_object(t_course2, 'confirmed'), ARRAY[60000]);
  PERFORM pg_temp.demo_registration(e_course, 'Jan', 'Král', 'jan.kral@example.com', '+420602000015', 'male',
    now_ts - interval '15 days', jsonb_build_object(t_course2, 'confirmed'));
  v_terms := jsonb_build_object(t_course2, 'pending');
  PERFORM pg_temp.demo_registration(e_course, 'Petra', 'Soukupová', 'petra.soukupova@example.com', '+420602000016', 'female',
    now_ts - interval '7 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Vít', 'Matoušek', 'vit.matousek@example.com', '+420602000017', 'male',
    now_ts - interval '1 day', v_terms);

  -- ── Trip: settled registrations, Jana's second registration fully paid ──
  PERFORM pg_temp.demo_registration(e_trip, 'Jana', 'Nováková', 'team4vse@seznam.cz', '+420601000001', 'female',
    now_ts - interval '18 days', jsonb_build_object(t_trip, 'confirmed'), ARRAY[45000]);
  PERFORM pg_temp.demo_registration(e_trip, 'Petr', 'Svoboda', 'petr.svoboda@example.com', '+420601000002', 'male',
    now_ts - interval '17 days', jsonb_build_object(t_trip, 'confirmed'), ARRAY[45000]);
  PERFORM pg_temp.demo_registration(e_trip, 'Ivana', 'Malá', 'ivana.mala@example.com', '+420602000001', 'female',
    now_ts - interval '12 days', jsonb_build_object(t_trip, 'confirmed'));
  PERFORM pg_temp.demo_registration(e_trip, 'Ondřej', 'Kučera', 'ondrej.kucera@example.com', '+420601000012', 'male',
    now_ts - interval '6 days', jsonb_build_object(t_trip, 'confirmed'), ARRAY[20000]);

  -- ── Changes waiting for approval ──
  -- Petr moves from the 1st to the 2nd term; the 2nd term waits for the organizer.
  INSERT INTO registration_change (id, "registrationId", "eventId", status, proposal, summary, "createdAt")
  VALUES (gen_random_uuid(), reg_petr, e_camp, 'pending',
    jsonb_build_object(
      'moves', jsonb_build_array(jsonb_build_object('fromTermId', t_camp1, 'toTermId', t_camp2, 'acceptRelease', true)),
      'cancelledTermIds', '[]'::jsonb,
      'baseVersion', 0),
    jsonb_build_object(
      'kinds', jsonb_build_array('move'),
      'values', '[]'::jsonb,
      'needs', NULL,
      'terms', jsonb_build_array(
        jsonb_build_object('termId', t_camp1, 'label', '1. turnus',
          'startDate', to_char(w + 28, 'YYYY-MM-DD'), 'endDate', to_char(w + 34, 'YYYY-MM-DD'),
          'priceMinor', 450000, 'original', 'confirmed', 'proposed', 'cancelled'),
        jsonb_build_object('termId', t_camp2, 'label', '2. turnus',
          'startDate', to_char(w + 35, 'YYYY-MM-DD'), 'endDate', to_char(w + 41, 'YYYY-MM-DD'),
          'priceMinor', 480000, 'original', NULL, 'proposed', 'pending')),
      'original', jsonb_build_object('dueMinor', 450000, 'paidMinor', 450000, 'balanceMinor', 0),
      'proposed', jsonb_build_object('dueMinor', 0, 'paidMinor', 450000, 'balanceMinor', -450000)),
    now_ts - interval '2 days');

  -- Tomáš changes his phone number.
  INSERT INTO registration_change (id, "registrationId", "eventId", status, proposal, summary, "createdAt")
  VALUES (gen_random_uuid(), reg_tomas, e_camp, 'pending',
    jsonb_build_object(
      'phone', '+420777123456',
      'moves', '[]'::jsonb,
      'cancelledTermIds', '[]'::jsonb,
      'baseVersion', 0),
    jsonb_build_object(
      'kinds', jsonb_build_array('data'),
      'values', jsonb_build_array(jsonb_build_object('field', 'phone', 'original', '+420601000004', 'proposed', '+420777123456')),
      'needs', NULL,
      'terms', jsonb_build_array(
        jsonb_build_object('termId', t_camp1, 'label', '1. turnus',
          'startDate', to_char(w + 28, 'YYYY-MM-DD'), 'endDate', to_char(w + 34, 'YYYY-MM-DD'),
          'priceMinor', 450000, 'original', 'confirmed', 'proposed', 'confirmed')),
      'original', jsonb_build_object('dueMinor', 450000, 'paidMinor', 450000, 'balanceMinor', 0),
      'proposed', jsonb_build_object('dueMinor', 450000, 'paidMinor', 450000, 'balanceMinor', 0)),
    now_ts - interval '1 day');

  RAISE NOTICE 'Demo set ready: organizer team4vse@seznam.cz, organization Spolek Jasan, 4 events.';
END $$;

COMMIT;
