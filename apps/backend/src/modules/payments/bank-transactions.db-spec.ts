import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Payment, Registration } from '@/generated/prisma/client';
import { BankTransactionsController } from '@/modules/payments/controllers/bank-transactions.controller';
import { BankTransactionsRepository } from '@/modules/payments/repositories/bank-transactions.repository';
import { BankTransactionsService } from '@/modules/payments/services/bank-transactions.service';
import { Mailbox, updateProviders } from '@/testing/confirmation-mail';
import {
  createEvent,
  createOrganization,
  createOrganizer,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// react-email's renderer cannot load under jest (see `render-markup.ts`).
jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
}));

// F23 and F24 through the HTTP API against a real database: the upload,
// parsing, the unique index against duplicates, pairing with registrations
// and the event scope together. Only the BetterAuth session is replaced: the
// `x-test-user` header names the caller.
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
    providers: [
      BankTransactionsService,
      BankTransactionsRepository,
      ...updateProviders(new Mailbox()),
    ],
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
      body: {
        received: 1,
        imported: 1,
        duplicates: 0,
        skippedOutgoing: 0,
        paired: 0,
      },
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
    const file = statement(
      movement(bankId(), '02.03.2027', '100,00', registration.variableSymbol),
      movement(bankId(), '03.03.2027', '200,00'),
    );
    expect((await upload(ownerId, path, file)).body).toMatchObject({
      imported: 2,
      paired: 1,
    });
    const payments = await paymentsOf(registration.id);
    expect(payments).toHaveLength(2);
    expect((await upload(ownerId, path, file)).body).toEqual({
      received: 2,
      imported: 0,
      duplicates: 2,
      skippedOutgoing: 0,
      paired: 0,
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
      body: {
        received: 0,
        imported: 0,
        duplicates: 0,
        skippedOutgoing: 0,
        paired: 0,
      },
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

const pair = async (
  userId: string,
  path: string,
  transactionId: string,
  body: Record<string, unknown>,
): Promise<Call> => {
  const response = await fetch(
    `${baseUrl}/${path}/bank-transactions/${transactionId}/pairing`,
    {
      method: 'POST',
      headers: { 'x-test-user': userId, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

/** The stored events of received payments of a registration (S4-06). */
const paymentEventsOf = (registrationId: string): Promise<number> =>
  prisma.emailDelivery.count({
    where: { registrationId, dedupKey: { startsWith: 'payment:' } },
  });

/** A confirmed registration of the event without payments. */
const registrationOf = async (eventId: string): Promise<Registration> => {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { terms: true },
  });
  return createRegistration(prisma, {
    event,
    terms: [{ term: event.terms[0]!, status: 'confirmed' }],
  });
};

/** Imports one movement and returns the stored transaction's id. */
const importOne = async (
  own: OwnEvent,
  vs = '',
  amount = '500,00',
): Promise<string> => {
  const id = bankId();
  await upload(
    own.ownerId,
    own.path,
    statement(movement(id, '05.03.2027', amount, vs)),
  );
  const stored = await prisma.bankTransaction.findFirstOrThrow({
    where: { eventId: own.eventId, bankTransactionId: id },
  });
  return stored.id;
};

describe('Párování plateb (F24)', () => {
  it('pairs a transaction by the variable symbol of a registration of the event', async () => {
    const own = await ownEvent();
    const registration = await registrationOf(own.eventId);
    const result = await upload(
      own.ownerId,
      own.path,
      statement(
        movement(bankId(), '05.03.2027', '500,00', registration.variableSymbol),
        movement(bankId(), '06.03.2027', '300,00', '9999999'),
        movement(bankId(), '07.03.2027', '200,00'),
      ),
    );
    expect(result.body).toMatchObject({ imported: 3, paired: 1 });
    expect(await paymentsOf(registration.id)).toEqual([
      expect.objectContaining({
        amountMinor: 50000,
        source: 'bank_transfer',
        recordedById: null,
        assignmentReason: null,
      }),
    ]);
    expect(await paymentEventsOf(registration.id)).toBe(1);
    // Without a match or without a symbol, both wait in the queue.
    const { body } = await list(own.ownerId, own.path);
    expect(
      body.transactions.map((t: { amountMinor: number }) => t.amountMinor),
    ).toEqual([20000, 30000]);
  });

  it('ignores leading zeros of the variable symbol', async () => {
    const own = await ownEvent();
    const registration = await registrationOf(own.eventId);
    await importOne(own, `000${registration.variableSymbol}`);
    expect(await paymentsOf(registration.id)).toHaveLength(1);
  });

  it("leaves a symbol of another event's registration unpaired", async () => {
    const own = await ownEvent();
    const other = await ownEvent();
    const foreign = await registrationOf(other.eventId);
    await importOne(own, foreign.variableSymbol);
    expect(await paymentsOf(foreign.id)).toEqual([]);
    expect((await list(own.ownerId, own.path)).body.transactions).toHaveLength(
      1,
    );
  });

  it('pairs a waiting transaction on a later import once its registration exists', async () => {
    const own = await ownEvent();
    // A symbol no registration has yet; a registration then gets it.
    const symbol = String(Math.floor(Math.random() * 9e9) + 1e9);
    await importOne(own, symbol);
    const registration = await prisma.registration.update({
      where: { id: (await registrationOf(own.eventId)).id },
      data: { variableSymbol: symbol },
    });
    const result = await upload(own.ownerId, own.path, statement());
    expect(result.body).toMatchObject({ imported: 0, paired: 1 });
    expect(await paymentsOf(registration.id)).toHaveLength(1);
  });

  it('pairs a queued transaction by hand with a reason and recomputes the balance', async () => {
    const own = await ownEvent();
    const registration = await registrationOf(own.eventId);
    const transactionId = await importOne(own, '', '1 500,00');
    expect(await paymentsOf(registration.id)).toEqual([]);

    const result = await pair(own.ownerId, own.path, transactionId, {
      registrationId: registration.id,
      reason: '  Platba od babičky bez VS  ',
    });
    expect(result.status).toBe(204);
    expect(await paymentsOf(registration.id)).toEqual([
      expect.objectContaining({
        amountMinor: 150000,
        receivedOn: new Date('2027-03-05T00:00:00.000Z'),
        source: 'bank_transfer',
        bankTransactionId: transactionId,
        recordedById: own.ownerId,
        assignmentReason: 'Platba od babičky bez VS',
      }),
    ]);
    expect(await paymentEventsOf(registration.id)).toBe(1);
    expect((await list(own.ownerId, own.path)).body.transactions).toEqual([]);
  });

  it('credits a transaction at most once', async () => {
    const own = await ownEvent();
    const [first, second] = [
      await registrationOf(own.eventId),
      await registrationOf(own.eventId),
    ];
    const transactionId = await importOne(own);
    const results = await Promise.all([
      pair(own.ownerId, own.path, transactionId, {
        registrationId: first.id,
        reason: 'Podle zprávy',
      }),
      pair(own.ownerId, own.path, transactionId, {
        registrationId: second.id,
        reason: 'Podle jména',
      }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    expect(
      await prisma.payment.count({
        where: { bankTransactionId: transactionId },
      }),
    ).toBe(1);
    const again = await pair(own.ownerId, own.path, transactionId, {
      registrationId: first.id,
      reason: 'Znovu',
    });
    expect(again).toMatchObject({
      status: 409,
      body: { code: 'transaction_already_paired' },
    });
    // Importing the same statement again creates no further payment event.
    expect(
      (await paymentEventsOf(first.id)) + (await paymentEventsOf(second.id)),
    ).toBe(1);
  });

  it('requires a reason', async () => {
    const own = await ownEvent();
    const registration = await registrationOf(own.eventId);
    const transactionId = await importOne(own);
    for (const reason of [undefined, '', '   ', 'x'.repeat(501)]) {
      const result = await pair(own.ownerId, own.path, transactionId, {
        registrationId: registration.id,
        reason,
      });
      expect(result.status).toBe(400);
    }
    expect(await paymentsOf(registration.id)).toEqual([]);
  });

  it('refuses a registration of another event, even when asked directly', async () => {
    const own = await ownEvent();
    const other = await ownEvent();
    const foreign = await registrationOf(other.eventId);
    const transactionId = await importOne(own);
    const result = await pair(own.ownerId, own.path, transactionId, {
      registrationId: foreign.id,
      reason: 'Omyl',
    });
    expect(result).toMatchObject({
      status: 400,
      body: { code: 'registration_unavailable' },
    });
    expect(await paymentsOf(foreign.id)).toEqual([]);
  });

  it("neither shows nor pairs another organizer's transaction", async () => {
    const own = await ownEvent();
    const foreign = await ownEvent();
    const registration = await registrationOf(foreign.eventId);
    const transactionId = await importOne(foreign);
    const asStranger = await pair(own.ownerId, foreign.path, transactionId, {
      registrationId: registration.id,
      reason: 'Cizí',
    });
    expect(asStranger.status).toBe(404);
    // A transaction of another event under the caller's own event path.
    const mixed = await pair(own.ownerId, own.path, transactionId, {
      registrationId: registration.id,
      reason: 'Cizí',
    });
    expect(mixed.status).toBe(404);
    expect(await paymentsOf(registration.id)).toEqual([]);
  });
});
