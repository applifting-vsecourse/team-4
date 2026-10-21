import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

afterAll(() => prisma.$disconnect());

it('migrates stored deadline values to reminders without changing snapshots', async () => {
  // Run the real migration against old-contract fixtures in an isolated schema.
  // The enclosing test transaction supplies BEGIN/COMMIT and rolls back on failure.
  const schema = `reminder_migration_${randomUUID().replace(/-/g, '')}`;
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261021150000_payment_reminder_contract/migration.sql',
    ),
    'utf8',
  );
  const statements = migration
    .replace(/^--.*$/gm, '')
    .split(';')
    .map((sql) => sql.trim())
    .filter((sql) => sql && sql !== 'BEGIN' && sql !== 'COMMIT');

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    await tx.$executeRawUnsafe(`
      CREATE TABLE event (
        id integer PRIMARY KEY,
        "bankAccountNumber" text,
        "bankCode" text,
        "paymentDueDays" integer,
        CONSTRAINT event_due_days_chk CHECK ("paymentDueDays" IS NULL OR "paymentDueDays" > 0)
      )
    `);
    await tx.$executeRawUnsafe(`
      CREATE TABLE registration (
        id integer PRIMARY KEY,
        "bankAccountNumber" text NOT NULL,
        "bankCode" text NOT NULL,
        "variableSymbol" text NOT NULL,
        "paymentDueDays" integer NOT NULL,
        "paymentDueAt" timestamptz(3),
        CONSTRAINT registration_due_days_chk CHECK ("paymentDueDays" > 0)
      )
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO event VALUES (1, NULL, NULL, NULL), (2, '123457', '0100', 30)
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO registration VALUES
        (1, '2000145399', '0800', '1000001', 14, '2026-10-01 12:34:56.789+02'),
        (2, '123457', '0100', '1000002', 7, NULL),
        (3, '123457', '0100', '1000003', 2147483647, '2027-03-28 03:30:00+02')
    `);
    const eventsBefore = await tx.$queryRawUnsafe(`
      SELECT id, "bankAccountNumber", "bankCode", "paymentDueDays" AS "days" FROM event ORDER BY id
    `);
    const registrationsBefore = await tx.$queryRawUnsafe(`
      SELECT id, "bankAccountNumber", "bankCode", "variableSymbol",
        "paymentDueDays" AS "days", "paymentDueAt" AS "date" FROM registration ORDER BY id
    `);

    for (const statement of statements) {
      await tx.$executeRawUnsafe(statement);
    }

    expect(
      await tx.$queryRawUnsafe(`
        SELECT id, "bankAccountNumber", "bankCode", "paymentReminderDays" AS "days" FROM event ORDER BY id
      `),
    ).toEqual(eventsBefore);
    expect(
      await tx.$queryRawUnsafe(`
        SELECT id, "bankAccountNumber", "bankCode", "variableSymbol",
          "paymentReminderDays" AS "days", "paymentReminderAt" AS "date" FROM registration ORDER BY id
      `),
    ).toEqual(registrationsBefore);
    expect(
      await tx.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = ${schema} AND column_name IN ('paymentDueDays', 'paymentDueAt')
      `,
    ).toEqual([]);

    // Both renamed checks still reject zero; savepoints keep the transaction usable.
    for (const table of ['event', 'registration']) {
      await tx.$executeRawUnsafe('SAVEPOINT invalid_days');
      await expect(
        tx.$executeRawUnsafe(`UPDATE "${table}" SET "paymentReminderDays" = 0`),
      ).rejects.toThrow(new RegExp(`${table}_reminder_days_chk`));
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT invalid_days');
    }
    await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  });
});
