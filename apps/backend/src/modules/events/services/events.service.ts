import { rangesOverlap } from '@/modules/events/domain/calendar-date';
import {
  EventDetailModel,
  EventInput,
  EventSummaryModel,
  findOpeningBlockers,
  PublicEventModel,
  TermInput,
} from '@/modules/events/domain/event';
import {
  findInvalidAccountField,
  PaymentSettings,
} from '@/modules/events/domain/payment-settings';
import {
  EventScope,
  EventsRepository,
  LockedEvent,
} from '@/modules/events/repositories/events.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// Error bodies carry a `code` (and the form `field` where one fits) next to
// the Czech `message`, so the form can put the error at the right input.
const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

const locked = (): ConflictException =>
  new ConflictException({
    statusCode: 409,
    code: 'event_locked',
    message:
      'Od prvního otevření přihlašování nelze měnit údaje akce, termíny ani ceny.',
  });

@Injectable()
export class EventsService {
  constructor(private readonly repository: EventsRepository) {}

  /** A foreign organization looks the same as a missing one (S2-03). */
  async list(
    organizationId: string,
    ownerId: string,
  ): Promise<EventSummaryModel[]> {
    const events = await this.repository.findAllInOrganization(
      organizationId,
      ownerId,
    );
    if (!events) throw notAvailable();
    return events;
  }

  async get(scope: EventScope): Promise<EventDetailModel> {
    const event = await this.repository.findDetail(scope);
    if (!event) throw notAvailable();
    return event;
  }

  /** Creating an event needs no term, accommodation or payment settings. */
  async create(
    organizationId: string,
    ownerId: string,
    input: EventInput,
  ): Promise<EventDetailModel> {
    const eventId = await this.repository.create(
      organizationId,
      ownerId,
      trimEvent(input),
    );
    if (!eventId) throw notAvailable();
    return this.get({ organizationId, ownerId, eventId });
  }

  async update(
    scope: EventScope,
    input: EventInput,
  ): Promise<EventDetailModel> {
    await this.write(scope, async (event) => {
      await event.updateBasics(trimEvent(input));
    });
    return this.get(scope);
  }

  /**
   * Unlike the other writes this stays open after the first opening (R3). The
   * event row lock serializes it with the opening, which reads the settings.
   * Registrations already received keep their own copy of the old settings.
   */
  async updatePaymentSettings(
    scope: EventScope,
    input: PaymentSettings,
  ): Promise<EventDetailModel> {
    const settings = validPaymentSettings(input);
    const outcome = await this.repository.withLockedEvent(scope, (event) =>
      event.updatePaymentSettings(settings),
    );
    if (!outcome.found) throw notAvailable();
    return this.get(scope);
  }

  /**
   * Catalog listing is independent of the registration status and stays
   * available after the first opening. Setting the current value again changes
   * nothing, so a retry after a lost answer is safe.
   */
  async setPublished(
    scope: EventScope,
    isPublished: boolean,
  ): Promise<EventDetailModel> {
    const outcome = await this.repository.withLockedEvent(scope, (event) =>
      event.setPublished(isPublished),
    );
    if (!outcome.found) throw notAvailable();
    return this.get(scope);
  }

  /**
   * Draft → open for the whole event (S2-06). The preconditions are read under
   * the event row lock, which every write to the terms, the basics and the
   * payment settings also takes, so nothing changes between check and update.
   * Opening an open event again is a no-op, so a retry after a lost answer is
   * safe.
   */
  async openRegistration(scope: EventScope): Promise<EventDetailModel> {
    const outcome = await this.repository.withLockedEvent(
      scope,
      async (event) => {
        if (event.status === 'open') return;
        if (event.status !== 'draft') {
          throw new ConflictException({
            statusCode: 409,
            code: 'event_not_draft',
            message: 'Přihlašování nelze znovu otevřít.',
          });
        }
        const blockers = findOpeningBlockers(await event.openingInput());
        if (blockers.length > 0) {
          throw new ConflictException({
            statusCode: 409,
            code: 'opening_conditions_not_met',
            blockers,
            message: 'Přihlašování nelze otevřít, doplňte chybějící údaje.',
          });
        }
        await event.open();
      },
    );
    if (!outcome.found) throw notAvailable();
    return this.get(scope);
  }

  /** Null-safe for the public link: anything but an open event is unavailable. */
  async getPublic(publicId: string): Promise<PublicEventModel> {
    const event = await this.repository.findOpenByPublicId(publicId);
    if (!event) throw notAvailable();
    return event;
  }

  async addTerm(
    scope: EventScope,
    input: TermInput,
  ): Promise<EventDetailModel> {
    const term = validTerm(input);
    await this.write(scope, async (event) => {
      await rejectOverlap(event, term);
      await event.insertTerm(term);
    });
    return this.get(scope);
  }

  async updateTerm(
    scope: EventScope,
    termId: string,
    input: TermInput,
  ): Promise<EventDetailModel> {
    const term = validTerm(input);
    await this.write(scope, async (event) => {
      await rejectOverlap(event, term, termId);
      if (!(await event.updateTerm(termId, term))) throw notAvailable();
    });
    return this.get(scope);
  }

  async removeTerm(
    scope: EventScope,
    termId: string,
  ): Promise<EventDetailModel> {
    await this.write(scope, async (event) => {
      if (!(await event.deleteTerm(termId))) throw notAvailable();
    });
    return this.get(scope);
  }

  /** Runs `work` on an unlocked event of the caller (data-model.md §3.3, R3). */
  private async write(
    scope: EventScope,
    work: (event: LockedEvent) => Promise<void>,
  ): Promise<void> {
    const outcome = await this.repository.withLockedEvent(
      scope,
      async (event) => {
        if (event.isLocked) throw locked();
        await work(event);
      },
    );
    if (!outcome.found) throw notAvailable();
  }
}

const trimEvent = (input: EventInput): EventInput => ({
  name: input.name.trim(),
  description: input.description.trim(),
  location: input.location.trim(),
});

/** Shape is the DTO's job; the checksum needs the digits together. */
const validPaymentSettings = (input: PaymentSettings): PaymentSettings => {
  const settings = {
    ...input,
    bankAccountPrefix: input.bankAccountPrefix || null,
  };
  const invalid = findInvalidAccountField(
    settings.bankAccountPrefix,
    settings.bankAccountNumber,
  );
  if (invalid) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'bank_account_invalid',
      field: invalid,
      message:
        invalid === 'bankAccountPrefix'
          ? 'Předčíslí není platné, zkontrolujte ho.'
          : 'Číslo účtu není platné, zkontrolujte ho.',
    });
  }
  return settings;
};

/** One-day terms are valid; the database CHECK is the safety net. */
const validTerm = (input: TermInput): TermInput => {
  if (input.endDate < input.startDate) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'term_dates',
      field: 'endDate',
      message: 'Konec nesmí být před začátkem.',
    });
  }
  return { ...input, label: input.label.trim() };
};

/**
 * Checked under the event row lock, so two concurrent writes cannot both pass;
 * the exclusion constraint `event_term_no_overlap` is the safety net.
 */
const rejectOverlap = async (
  event: LockedEvent,
  term: TermInput,
  ignoreTermId?: string,
): Promise<void> => {
  const clash = (await event.terms()).find(
    (other) => other.id !== ignoreTermId && rangesOverlap(other, term),
  );
  if (clash) {
    throw new ConflictException({
      statusCode: 409,
      code: 'term_overlap',
      field: 'startDate',
      message: `Překrývá se s termínem „${clash.label}“.`,
    });
  }
};
