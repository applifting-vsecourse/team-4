import { EventDetailModel, TermInput } from '@/modules/events/domain/event';
import {
  EventsRepository,
  LockedEvent,
  StoredTerm,
} from '@/modules/events/repositories/events.repository';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventsService } from './events.service';

const scope = { organizationId: 'org', ownerId: 'user-1', eventId: 'event' };
const detail = new EventDetailModel(
  'event',
  'A',
  'B',
  'C',
  'draft',
  false,
  [],
  null,
  'public12chars',
);

const term = (overrides: Partial<TermInput> = {}): TermInput => ({
  label: '2. turnus',
  startDate: '2027-07-08',
  endDate: '2027-07-10',
  priceMinor: 0,
  ...overrides,
});

const JULY: StoredTerm[] = [
  {
    id: 't1',
    label: '1. turnus',
    startDate: '2027-07-01',
    endDate: '2027-07-07',
  },
];

describe('EventsService', () => {
  const event = {
    isLocked: false,
    status: 'draft',
    openingInput: jest.fn(),
    open: jest.fn(),
    terms: jest.fn(),
    updateBasics: jest.fn(),
    updatePaymentSettings: jest.fn(),
    insertTerm: jest.fn(),
    updateTerm: jest.fn(),
    deleteTerm: jest.fn(),
  };
  const repository = {
    findAllInOrganization: jest.fn(),
    findDetail: jest.fn(),
    create: jest.fn(),
    withLockedEvent: jest.fn(),
    findOpenByPublicId: jest.fn(),
  };
  const service = new EventsService(repository as unknown as EventsRepository);

  beforeEach(() => {
    jest.resetAllMocks();
    event.isLocked = false;
    event.status = 'draft';
    event.terms.mockResolvedValue(JULY);
    event.updateTerm.mockResolvedValue(true);
    event.deleteTerm.mockResolvedValue(true);
    repository.findDetail.mockResolvedValue(detail);
    repository.withLockedEvent.mockImplementation(
      async (_scope, work: (e: LockedEvent) => Promise<unknown>) => ({
        found: true,
        result: await work(event as unknown as LockedEvent),
      }),
    );
  });

  it('hides a foreign or missing organization behind the same 404', async () => {
    repository.findAllInOrganization.mockResolvedValue(null);
    await expect(service.list('org', 'user-1')).rejects.toEqual(
      new NotFoundException('Záznam není dostupný'),
    );
  });

  it('creates a draft event with trimmed fields in an own organization', async () => {
    repository.create.mockResolvedValue('event');
    await expect(
      service.create('org', 'user-1', {
        name: ' Tábor ',
        description: ' Popis ',
        location: ' Podlesí ',
      }),
    ).resolves.toBe(detail);
    expect(repository.create).toHaveBeenCalledWith('org', 'user-1', {
      name: 'Tábor',
      description: 'Popis',
      location: 'Podlesí',
    });
  });

  it('refuses to create an event in a foreign organization', async () => {
    repository.create.mockResolvedValue(null);
    await expect(
      service.create('org', 'user-1', {
        name: 'A',
        description: 'B',
        location: 'C',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts a one-day term and a term starting the day after another ends', async () => {
    await service.addTerm(
      scope,
      term({ startDate: '2027-07-08', endDate: '2027-07-08' }),
    );
    expect(event.insertTerm).toHaveBeenCalledWith(
      term({ startDate: '2027-07-08', endDate: '2027-07-08' }),
    );
  });

  it('rejects an end before the start before touching the event', async () => {
    await expect(
      service.addTerm(
        scope,
        term({ startDate: '2027-07-10', endDate: '2027-07-09' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.withLockedEvent).not.toHaveBeenCalled();
  });

  it('rejects a term sharing a boundary day with another one', async () => {
    const result = service.addTerm(
      scope,
      term({ startDate: '2027-07-07', endDate: '2027-07-10' }),
    );
    await expect(result).rejects.toBeInstanceOf(ConflictException);
    await expect(result).rejects.toMatchObject({
      response: { code: 'term_overlap', field: 'startDate' },
    });
    expect(event.insertTerm).not.toHaveBeenCalled();
  });

  it('lets a term keep its own dates when it is edited', async () => {
    await service.updateTerm(scope, 't1', {
      ...term(),
      startDate: '2027-07-01',
      endDate: '2027-07-07',
      priceMinor: 790050,
    });
    expect(event.updateTerm).toHaveBeenCalledWith('t1', {
      ...term(),
      startDate: '2027-07-01',
      endDate: '2027-07-07',
      priceMinor: 790050,
    });
  });

  it('answers 404 for a term of another event', async () => {
    event.updateTerm.mockResolvedValue(false);
    event.deleteTerm.mockResolvedValue(false);
    await expect(service.updateTerm(scope, 'x', term())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.removeTerm(scope, 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('answers 404 when the event is not in an own organization', async () => {
    repository.withLockedEvent.mockResolvedValue({ found: false });
    await expect(service.removeTerm(scope, 't1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    [
      'update',
      (): Promise<unknown> =>
        service.update(scope, { name: 'A', description: 'B', location: 'C' }),
    ],
    ['addTerm', (): Promise<unknown> => service.addTerm(scope, term())],
    [
      'updateTerm',
      (): Promise<unknown> => service.updateTerm(scope, 't1', term()),
    ],
    ['removeTerm', (): Promise<unknown> => service.removeTerm(scope, 't1')],
  ])('refuses %s on a locked event', async (_name, call) => {
    event.isLocked = true;
    await expect(call()).rejects.toMatchObject({
      response: { code: 'event_locked' },
    });
    expect(event.updateBasics).not.toHaveBeenCalled();
    expect(event.insertTerm).not.toHaveBeenCalled();
    expect(event.updateTerm).not.toHaveBeenCalled();
    expect(event.deleteTerm).not.toHaveBeenCalled();
  });

  describe('payment settings', () => {
    const settings = {
      bankAccountPrefix: '19',
      bankAccountNumber: '2000145399',
      bankCode: '0800',
      paymentReminderDays: 14,
    };

    it('saves a valid account, also on a locked event', async () => {
      event.isLocked = true;
      await service.updatePaymentSettings(scope, settings);
      expect(event.updatePaymentSettings).toHaveBeenCalledWith(settings);
    });

    it('stores an empty prefix as none', async () => {
      await service.updatePaymentSettings(scope, {
        ...settings,
        bankAccountPrefix: '',
        bankAccountNumber: '123457',
      });
      expect(event.updatePaymentSettings).toHaveBeenCalledWith({
        ...settings,
        bankAccountPrefix: null,
        bankAccountNumber: '123457',
      });
    });

    it('rejects a number with a bad checksum at its field', async () => {
      await expect(
        service.updatePaymentSettings(scope, {
          ...settings,
          bankAccountNumber: '2000145398',
        }),
      ).rejects.toMatchObject({
        response: { code: 'bank_account_invalid', field: 'bankAccountNumber' },
      });
      expect(repository.withLockedEvent).not.toHaveBeenCalled();
    });

    it('rejects a prefix with a bad checksum at its field', async () => {
      await expect(
        service.updatePaymentSettings(scope, {
          ...settings,
          bankAccountPrefix: '20',
        }),
      ).rejects.toMatchObject({
        response: { code: 'bank_account_invalid', field: 'bankAccountPrefix' },
      });
    });

    it('hides a foreign or missing event behind the same 404', async () => {
      repository.withLockedEvent.mockResolvedValue({ found: false });
      await expect(
        service.updatePaymentSettings(scope, settings),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('opening registration', () => {
    const ready = {
      name: 'A',
      description: 'B',
      location: 'C',
      termCount: 1,
      paymentSettings: {
        bankAccountPrefix: '19',
        bankAccountNumber: '2000145399',
        bankCode: '0800',
        paymentReminderDays: 14,
      },
    };

    it('opens a ready draft', async () => {
      event.openingInput.mockResolvedValue(ready);
      await service.openRegistration(scope);
      expect(event.open).toHaveBeenCalledTimes(1);
    });

    it('opens nothing and names what is missing', async () => {
      event.openingInput.mockResolvedValue({
        ...ready,
        termCount: 0,
        paymentSettings: null,
      });
      await expect(service.openRegistration(scope)).rejects.toMatchObject({
        response: {
          code: 'opening_conditions_not_met',
          blockers: ['terms', 'paymentSettings'],
        },
      });
      expect(event.open).not.toHaveBeenCalled();
    });

    it('does not open an open event twice', async () => {
      event.status = 'open';
      await service.openRegistration(scope);
      expect(event.openingInput).not.toHaveBeenCalled();
      expect(event.open).not.toHaveBeenCalled();
    });

    it('refuses a closed event', async () => {
      event.status = 'closed';
      await expect(service.openRegistration(scope)).rejects.toMatchObject({
        response: { code: 'event_not_draft' },
      });
    });

    it('hides a foreign or missing event behind the same 404', async () => {
      repository.withLockedEvent.mockResolvedValue({ found: false });
      await expect(service.openRegistration(scope)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('gives a draft or unknown public link the same 404', async () => {
      repository.findOpenByPublicId.mockResolvedValue(null);
      await expect(service.getPublic('abc')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
