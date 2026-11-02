import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Registration } from '@/generated/prisma/client';
import { QrPaymentsController } from '@/modules/registrations/controllers/qr-payments.controller';
import { QrPaymentsRepository } from '@/modules/registrations/repositories/qr-payments.repository';
import { QrPaymentsService } from '@/modules/registrations/services/qr-payments.service';
import {
  createEvent,
  createOrganization,
  createPayment,
  createRegistration,
} from '@/testing/factories';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// F21-1 through the HTTP API against a real database: the public payment
// page, full and partial payment, repeats, concurrent payments and the token
// as the only credential. Needs `pnpm backend test:db`.

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [QrPaymentsController],
    providers: [QrPaymentsService, QrPaymentsRepository],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
});

afterAll(() => app.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Call = { status: number; body: any };

const call = async (
  method: 'GET' | 'POST',
  token: string,
  body?: unknown,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/public/payments/${token}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const pay = (
  token: string,
  amountMinor: number,
  submissionKey = randomUUID(),
) => call('POST', token, { submissionKey, amountMinor });

const T1 = {
  startDate: '2027-07-01',
  endDate: '2027-07-07',
  label: 'T1',
  priceMinor: 100_000,
};

/** A registration owing 1 000 Kč. */
const fixture = async (): Promise<Registration> => {
  const organization = await createOrganization(prisma);
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    terms: [T1],
  });
  return createRegistration(prisma, {
    event: created.event,
    terms: [{ term: created.terms[0], status: 'confirmed' }],
  });
};

const payments = (registrationId: string) =>
  prisma.payment.findMany({ where: { registrationId } });

describe('the QR payment page', () => {
  it('shows the event and the debt, and records nothing', async () => {
    const registration = await fixture();
    const page = await call('GET', registration.paymentToken);
    expect(page.status).toBe(200);
    expect(page.body).toEqual({
      registrationId: registration.id,
      eventName: expect.stringContaining('Event'),
      balanceMinor: 100_000,
    });
    expect(await payments(registration.id)).toHaveLength(0);
  });

  it('is unavailable for an unknown or malformed token, without personal data', async () => {
    const registration = await fixture();
    const unknown = await call('GET', 'f'.repeat(64));
    const malformed = await call('GET', registration.id);
    for (const result of [unknown, malformed]) {
      expect(result.status).toBe(404);
      expect(JSON.stringify(result.body)).not.toContain(registration.email);
    }
    expect((await pay('f'.repeat(64), 100)).status).toBe(404);
  });

  it('reports no debt once settled', async () => {
    const registration = await fixture();
    await pay(registration.paymentToken, 100_000);
    const page = await call('GET', registration.paymentToken);
    expect(page.body.balanceMinor).toBe(0);
  });
});

describe('paying through the QR link', () => {
  it('records a partial payment, then the rest, marked as a QR payment', async () => {
    const registration = await fixture();
    const first = await pay(registration.paymentToken, 25_050);
    expect(first).toMatchObject({
      status: 201,
      body: { paidMinor: 25_050, balanceMinor: 74_950 },
    });
    const second = await pay(registration.paymentToken, 74_950);
    expect(second.body).toEqual({ paidMinor: 74_950, balanceMinor: 0 });
    const stored = await payments(registration.id);
    expect(stored).toHaveLength(2);
    expect(
      stored.every((p) => p.source === 'qr_link' && p.recordedById === null),
    ).toBe(true);
  });

  it('refuses invalid amounts and keeps the debt', async () => {
    const registration = await fixture();
    for (const amountMinor of [0, -5, 10.5, 'abc', null]) {
      expect(
        (await pay(registration.paymentToken, amountMinor as number)).status,
      ).toBe(400);
    }
    expect(await payments(registration.id)).toHaveLength(0);
  });

  it('refuses more than the debt and says what is left', async () => {
    const registration = await fixture();
    const { ownerId } = await prisma.organization.findUniqueOrThrow({
      where: { id: registration.organizationId },
    });
    await createPayment(prisma, {
      registration,
      recordedById: ownerId,
      amountMinor: 70_000,
    });
    const result = await pay(registration.paymentToken, 100_000);
    expect(result).toMatchObject({
      status: 409,
      body: { code: 'debt_reduced', balanceMinor: 30_000 },
    });
    expect(await payments(registration.id)).toHaveLength(1);
  });

  it('refuses a payment once nothing is owed', async () => {
    const registration = await fixture();
    await pay(registration.paymentToken, 100_000);
    const result = await pay(registration.paymentToken, 100);
    expect(result).toMatchObject({
      status: 409,
      body: { code: 'nothing_to_pay' },
    });
    expect(await payments(registration.id)).toHaveLength(1);
  });

  it('does not repeat a saved request, even after the debt is settled', async () => {
    const registration = await fixture();
    const key = randomUUID();
    const first = await pay(registration.paymentToken, 100_000, key);
    const repeat = await pay(registration.paymentToken, 100_000, key);
    expect(first.status).toBe(201);
    expect(repeat).toMatchObject({
      status: 200,
      body: { paidMinor: 100_000, balanceMinor: 0 },
    });
    expect(await payments(registration.id)).toHaveLength(1);
  });

  it('rejects a key reused with another amount or for another registration', async () => {
    const registration = await fixture();
    const other = await fixture();
    const key = randomUUID();
    await pay(registration.paymentToken, 10_000, key);
    expect((await pay(registration.paymentToken, 20_000, key)).status).toBe(
      409,
    );
    expect((await pay(other.paymentToken, 10_000, key)).status).toBe(409);
    expect(await payments(other.id)).toHaveLength(0);
  });

  it('lets concurrent payments never exceed the debt', async () => {
    const registration = await fixture();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => pay(registration.paymentToken, 60_000)),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    const total = (await payments(registration.id)).reduce(
      (sum, p) => sum + p.amountMinor,
      0,
    );
    expect(total).toBe(60_000);
  });

  it('pays only the registration of its own token', async () => {
    const registration = await fixture();
    const other = await fixture();
    await pay(registration.paymentToken, 10_000);
    expect(await payments(other.id)).toHaveLength(0);
  });
});
