import { rangesOverlap } from '@/modules/events/domain/calendar-date';
import {
  EventDetailModel,
  EventInput,
  EventSummaryModel,
  TermInput,
} from '@/modules/events/domain/event';
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
