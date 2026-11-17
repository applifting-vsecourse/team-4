import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Payment, Registration } from '@/generated/prisma/client';
import { BankTransactionsController } from '@/modules/payments/controllers/bank-transactions.controller';
import { BankTransactionsRepository } from '@/modules/payments/repositories/bank-transactions.repository';
import { BankTransactionsService } from '@/modules/payments/services/bank-transactions.service';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// F23 through the HTTP API against a real database: the upload, parsing,
// the unique index against duplicates and the event scope together. Only the
// BetterAuth session is replaced: the `x-test-user` header names the caller.
// Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

// The real guard pulls in BetterAuth, which is ESM-only and cannot load under
// Jest's CommonJS runtime, so the whole guard module is replaced (jest.mock is
// hoisted above the imports).
jest.mock('@/shared/auth/guards/authenticated-user.guard', () => ({
  AuthenticatedUserGuard: class {
    canActivate(context: {
      switchToHttp: () => {
        getRequest: () => {
          headers: Record<string, unknown>;
          session?: { user: { id: string } };
        };
      };
    }): boolean {
      const request = context.switchToHttp().getRequest();
      const id = request.headers['x-test-user'];
      if (typeof id !== 'string') return false;
      request.session = { user: { id } };
      return true;
    }
  },
}));

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [BankTransactionsController],
    providers: [BankTransactionsService, BankTransactionsRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

// Response bodies are asserted field by field; typing every DTO here adds nothing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const list = async (userId: string, path: string): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}/bank-transactions`, {
    headers: { 'x-test-user': userId },
  });
  return { status: response.status, body: await response.json() };
};

const upload = async (
  userId: string,
  path: string,
  content: string | Uint8Array,
): Promise<Call> => {
  const form = new FormData();
  form.append(
    'file',
    new Blob([typeof content === 'string' ? content : Buffer.from(content)]),
    'vypis.csv',
  );
  const response = await fetch(`${baseUrl}/${path}/bank-transactions/import`, {
    method: 'POST',
    headers: { 'x-test-user': userId },
    body: form,
  });
  return { status: response.status, body: await response.json() };
};

const HEADER =
  '"ID operace";"Datum";"Objem";"Měna";"Protiúčet";"Název protiúčtu";"Kód banky";"Název banky";"KS";"VS";"SS";"Poznámka";"Zpráva pro příjemce";"Typ"';

// Bank ids are unique per event only, but the runs share one database.
let nextId = Date.now() * 10;
const bankId = (): string => String((nextId += 1));

const movement = (id: string, date: string, amount: string, vs = ''): string =>
  `"${id}";"${date}";"${amount}";"CZK";"123456789";"Jan Novák";"0100";"KB";"";"${vs}";"";"Platba";"Tábor";"Bezhotovostní příjem"`;

const statement = (...movements: string[]): string =>
  [
    '"Výpis č. 3/2027 z účtu ""2001234567/2010""";',
    '"Období: 01.03.2027 - 31.03.2027";',
    '"";',
    HEADER,
    ...movements,
  ].join('\r\n');

type OwnEvent = {
  ownerId: string;
  organizationId: string;
  eventId: string;
  path: string;
  /** A confirmed registration of the event with one payment of 100 Kč. */
  paidRegistration: () => Promise<Registration>;
};

const ownEvent = async (): Promise<OwnEvent> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const { event, terms } = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [{ startDate: '2027-07-01', endDate: '2027-07-07' }],
  });
  return {
    ownerId: owner.id,
    organizationId: organization.id,
    eventId: event.id,
    path: `organizations/${organization.id}/events/${event.id}`,
    paidRegistration: async (): Promise<Registration> => {
      const registration = await createRegistration(prisma, {
        event,
        terms: [{ term: terms[0]!, status: 'confirmed' }],
      });
      await createPayment(prisma, {
        registration,
        recordedById: owner.id,
        amountMinor: 10000,
      });
      return registration;
    },
  };
};

const paymentsOf = (registrationId: string): Promise<Payment[]> =>
  prisma.payment.findMany({ where: { registrationId } });

const storedCount = (eventId: string): Promise<number> =>
  prisma.bankTransaction.count({ where: { eventId } });

describe('Import výpisu (F23)', () => {
  it('starts with no transactions and imports into an event without payments', async () => {
    const { ownerId, path } = await ownEvent();
    expect(await list(ownerId, path)).toEqual({
      status: 200,
      body: { transactions: [] },
    });
    const id = bankId();
    const result = await upload(
      ownerId,
      path,
      statement(movement(id, '02.03.2027', '1 500,00', '1001')),
    );
    expect(result).toEqual({
      status: 200,
      body: { received: 1, imported: 1, duplicates: 0, skippedOutgoing: 0 },
    });
  });

  it('keeps amounts, variable symbols and dates of the statement, newest first', async () => {
    const { ownerId, path } = await ownEvent();
    const [older, newer] = [bankId(), bankId()];
    await upload(
      ownerId,
      path,
      statement(
        movement(older, '02.03.2027', '1500,00', '1001'),
        movement(newer, '15.03.2027', '250,50', ''),
        movement(bankId(), '16.03.2027', '-99,00', '1003'),
      ),
    );
    const { body } = await list(ownerId, path);
    expect(body.transactions).toEqual([
      expect.objectContaining({
        bankTransactionId: newer,
        bookedOn: '2027-03-15',
        amountMinor: 25050,
        variableSymbol: null,
      }),
      expect.objectContaining({
        bankTransactionId: older,
        bookedOn: '2027-03-02',
        amountMinor: 150000,
        variableSymbol: '1001',
        counterpartyAccount: '123456789/0100',
        counterpartyName: 'Jan Novák',
        message: 'Tábor',
      }),
    ]);
  });

  it('does not duplicate transactions or payments on a repeated import', async () => {
    const { ownerId, eventId, path, paidRegistration } = await ownEvent();
    const registration = await paidRegistration();
    const payments = await paymentsOf(registration.id);
    const file = statement(
      movement(bankId(), '02.03.2027', '100,00', registration.variableSymbol),
      movement(bankId(), '03.03.2027', '200,00'),
    );
    expect((await upload(ownerId, path, file)).body).toMatchObject({
      imported: 2,
    });
    expect((await upload(ownerId, path, file)).body).toEqual({
      received: 2,
      imported: 0,
      duplicates: 2,
      skippedOutgoing: 0,
    });
    expect(await storedCount(eventId)).toBe(2);
    expect(await paymentsOf(registration.id)).toEqual(payments);
  });

  it('imports an empty statement as zero transactions and changes no balance', async () => {
    const { ownerId, eventId, path, paidRegistration } = await ownEvent();
    const registration = await paidRegistration();
    const payments = await paymentsOf(registration.id);
    expect(await upload(ownerId, path, statement())).toEqual({
      status: 200,
      body: { received: 0, imported: 0, duplicates: 0, skippedOutgoing: 0 },
    });
    expect(await storedCount(eventId)).toBe(0);
    expect(await paymentsOf(registration.id)).toEqual(payments);
  });

  it('rejects an unsupported file', async () => {
    const { ownerId, eventId, path } = await ownEvent();
    const result = await upload(ownerId, path, 'jméno,příjmení\nJan,Novák');
    expect(result).toEqual({
      status: 400,
      body: expect.objectContaining({ code: 'statement_format' }),
    });
    expect(await storedCount(eventId)).toBe(0);
  });

  it('stores nothing from a statement with an invalid movement', async () => {
    const { ownerId, eventId, path } = await ownEvent();
    const result = await upload(
      ownerId,
      path,
      statement(
        movement(bankId(), '02.03.2027', '100,00'),
        movement(bankId(), '31.02.2027', '100,00'),
      ),
    );
    expect(result).toEqual({
      status: 400,
      body: expect.objectContaining({
        code: 'statement_invalid',
        message: expect.stringContaining(
          'Řádek 6 výpisu obsahuje neplatné datum',
        ),
      }),
    });
    expect(await storedCount(eventId)).toBe(0);
  });

  it('refuses a request without a file', async () => {
    const { ownerId, path } = await ownEvent();
    const response = await fetch(
      `${baseUrl}/${path}/bank-transactions/import`,
      {
        method: 'POST',
        headers: { 'x-test-user': ownerId },
        body: new FormData(),
      },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'statement_format' });
  });

  it("neither shows nor imports into another organizer's event", async () => {
    const own = await ownEvent();
    const foreign = await ownEvent();
    await upload(
      foreign.ownerId,
      foreign.path,
      statement(movement(bankId(), '02.03.2027', '100,00')),
    );
    expect((await list(own.ownerId, foreign.path)).status).toBe(404);
    const result = await upload(
      own.ownerId,
      foreign.path,
      statement(movement(bankId(), '03.03.2027', '100,00')),
    );
    expect(result.status).toBe(404);
    expect(await storedCount(foreign.eventId)).toBe(1);
    // Own organization, the other organizer's event id: still not available.
    const mixed = `organizations/${own.organizationId}/events/${foreign.eventId}`;
    expect((await list(own.ownerId, mixed)).status).toBe(404);
    expect(
      (
        await upload(
          own.ownerId,
          mixed,
          statement(movement(bankId(), '03.03.2027', '100,00')),
        )
      ).status,
    ).toBe(404);
    expect(await storedCount(foreign.eventId)).toBe(1);
  });

  it('keeps the same movement apart in two events', async () => {
    const first = await ownEvent();
    const second = await ownEvent();
    const file = statement(movement(bankId(), '02.03.2027', '100,00'));
    expect((await upload(first.ownerId, first.path, file)).body.imported).toBe(
      1,
    );
    expect(
      (await upload(second.ownerId, second.path, file)).body.imported,
    ).toBe(1);
  });
});
