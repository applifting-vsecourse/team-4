import { createHash, randomBytes } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import pg from "pg"

// Direct database access for what the UI only reaches through e-mail: a
// magic link is created here, the same way the backend stores one, so a test
// can open it without sending or reading any message. `decideTerms` stands in
// for the organizer's confirmation until the term evaluation offers it.

const BACKEND_ENV = fileURLToPath(new URL("../../../backend/.env", import.meta.url))

/** The backend's database: the env variable (CI), else the backend's .env. */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const fromFile = existsSync(BACKEND_ENV)
    ? parseEnv(readFileSync(BACKEND_ENV, "utf8")).DATABASE_URL
    : undefined
  if (!fromFile) throw new Error("DATABASE_URL not set and not found in apps/backend/.env")
  return fromFile
}

let pool: pg.Pool | undefined
const db = () => (pool ??= new pg.Pool({ connectionString: databaseUrl() }))

export async function closeDb() {
  await pool?.end()
  pool = undefined
}

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

/**
 * Stores a magic link for the participant account of `email` (which exists
 * once a registration is saved) and returns its token. Like the backend, it
 * keeps only the token's SHA-256.
 */
export async function createMagicLink(
  email: string,
  { expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS) }: { expiresAt?: Date } = {},
): Promise<string> {
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const { rowCount } = await db().query(
    `INSERT INTO participant_magic_link (id, "participantAccountId", "tokenHash", "expiresAt")
     SELECT gen_random_uuid(), id, $2, $3 FROM participant_account WHERE email = $1`,
    [email.trim().toLowerCase(), tokenHash, expiresAt],
  )
  if (rowCount !== 1) throw new Error(`No participant account for ${email}`)
  return token
}

/** The QR payment token of a registration, which the UI only shows to its participant. */
export async function paymentToken(registrationId: string): Promise<string> {
  const { rows } = await db().query<{ paymentToken: string }>(
    `SELECT "paymentToken" FROM registration WHERE id = $1`,
    [registrationId],
  )
  if (!rows[0]) throw new Error(`No registration ${registrationId}`)
  return rows[0].paymentToken
}

/**
 * Stand-in for the organizer's decision in the term evaluation (S3-01, slice
 * 2) until the UI offers it: a registration's terms (all of them by default)
 * become `status`. A confirmation starts the payment reminder the way the
 * backend does once something is owed, and bumps the registration version.
 */
export async function decideTerms(
  registrationId: string,
  status: "confirmed" | "waitlisted",
  termIds?: string[],
): Promise<void> {
  const { rowCount } = await db().query(
    `UPDATE registration_term SET status = $2, "decidedAt" = now()
     WHERE "registrationId" = $1 AND status = 'pending'
       AND ($3::uuid[] IS NULL OR "termId" = ANY($3::uuid[]))`,
    [registrationId, status, termIds ?? null],
  )
  if (!rowCount) throw new Error(`No pending term of registration ${registrationId}`)
  await db().query(
    `UPDATE registration r SET version = version + 1,
       "paymentReminderAt" = COALESCE(r."paymentReminderAt",
         CASE WHEN EXISTS (
           SELECT 1 FROM registration_term t
           WHERE t."registrationId" = r.id AND t.status = 'confirmed' AND t."priceMinor" > 0
         ) THEN now() + make_interval(days => r."paymentReminderDays") END)
     WHERE r.id = $1`,
    [registrationId],
  )
}

/** The registration saved for `email`, which the UI shows only after signing in. */
export async function registrationIdOf(email: string): Promise<string> {
  const { rows } = await db().query<{ id: string }>(
    `SELECT id FROM registration WHERE lower(email) = lower($1)`,
    [email.trim()],
  )
  if (rows.length !== 1) throw new Error(`Expected one registration of ${email}`)
  return rows[0]!.id
}

/** The id of a registration's term labelled `label`, for terms created in the UI. */
export async function termIdOf(registrationId: string, label: string): Promise<string> {
  const { rows } = await db().query<{ id: string }>(
    `SELECT t.id FROM registration_term rt JOIN event_term t ON t.id = rt."termId"
     WHERE rt."registrationId" = $1 AND t.label = $2`,
    [registrationId, label],
  )
  if (rows.length !== 1) throw new Error(`No term ${label} in registration ${registrationId}`)
  return rows[0]!.id
}
