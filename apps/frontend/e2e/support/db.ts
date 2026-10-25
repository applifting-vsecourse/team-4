import { createHash, randomBytes } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import pg from "pg"

// Direct database access for what the UI only reaches through e-mail: a
// magic link is created here, the same way the backend stores one, so a test
// can open it without sending or reading any message.

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

export type EmailType = "registration_confirmation" | "participant_magic_link"

/**
 * How many e-mails of `type` the backend handed to the mail provider for
 * `email`, from its outbound log (`email_delivery`). Failed sends do not count.
 */
export async function emailsSent(type: EmailType, email: string): Promise<number> {
  const { rows } = await db().query<{ count: string }>(
    `SELECT count(*) FROM email_delivery
     WHERE type = $1::email_type AND lower("recipientEmail") = $2 AND status <> 'failed'`,
    [type, email.trim().toLowerCase()],
  )
  return Number(rows[0]!.count)
}
