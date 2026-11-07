import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { effectiveValue } from '@/modules/accommodation/domain/effective-value';
import {
  moveInOrder,
  MoveRefusal,
  Placement,
  termOrder,
} from '@/modules/accommodation/domain/term-order';
import { Actor } from '@/modules/accommodation/repositories/registration-accommodation.repository';
import { ownedEvent } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import { HardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

/** What an intervention of kind `position` stores before the move. */
type PositionBefore = {
  /** The term's input version the organizer saw; the move was made on it. */
  inputVersion: number;
  queue: string | null;
  order: string[];
  queueOrder: string[];
  position: number;
};

/** What an intervention of kind `position` stores after the move. */
type PositionAfter = {
  inputVersion: number;
  targetId: string;
  placement: Placement;
  order: string[];
  queueOrder: string[];
  position: number;
};

type Name = { firstName: string; lastName: string };

/** One manual change of position in the immutable audit (F39-1). */
export type MoveRecord = {
  id: string;
  createdAt: Date;
  actor: Actor;
  reason: string;
  termId: string;
  termLabel: string;
  registrationId: string;
  person: Name;
  /** The effective value; null for the one queue without a hard attribute. */
  queue: string | null;
  placement: Placement;
  targetId: string;
  target: Name;
  /** In the term order, 1 is the highest priority. */
  fromPosition: number;
  toPosition: number;
  /** The term's input version the move was made on. */
  inputVersion: number;
};

export type MoveOutcome =
  | { kind: 'moved' }
  | { kind: 'not_found' }
  /** The order, a participation or another input changed since it was read. */
  | { kind: 'stale' }
  | { kind: 'refused'; refusal: MoveRefusal };

export type MoveInput = {
  registrationId: string;
  targetId: string;
  placement: Placement;
  reason: string;
  /** The term's input version the organizer saw. */
  expectedVersion: number;
  actorId: string;
};

const recordSelect = {
  id: true,
  createdAt: true,
  reason: true,
  termId: true,
  before: true,
  after: true,
  actor: { select: { id: true, name: true } },
  term: { select: { label: true } },
  registration: {
    select: { id: true, firstName: true, lastName: true },
  },
} satisfies Prisma.AccommodationInterventionSelect;

type RecordRow = Prisma.AccommodationInterventionGetPayload<{
  select: typeof recordSelect;
}>;

const newestFirst = [
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.AccommodationInterventionOrderByWithRelationInput[];

@Injectable()
export class OrderMovesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly answers: HardAttributeAnswers,
  ) {}

  /**
   * Places an unconfirmed person right before or after another one of their
   * queue (spec v4 §6), with an immutable record of who, when, whom, the
   * original and the new order, why, and the input version it was made on.
   * The term's state row is locked, so the order is read and written at the
   * version the organizer saw; any other version is stale. The move bumps the
   * version, so the proposal turns stale and the automatic mode evaluates the
   * term again. The same request sent again finds its own record and changes
   * nothing more.
   */
  async move(
    scope: EventScope,
    termId: string,
    input: MoveInput,
  ): Promise<MoveOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const term = await tx.eventTerm.findFirst({
        where: { id: termId, eventId: scope.eventId, event: ownedEvent(scope) },
        select: { eventId: true },
      });
      if (!term) return { kind: 'not_found' };

      // The moved person's registration first, then the term, then its state:
      // the order every writer of a registration and the version uses (a
      // determination, a correction, a change). The record's foreign key
      // would take the registration last otherwise, and deadlock with them.
      await tx.$queryRaw`
        SELECT "id" FROM "registration"
        WHERE "id" = ${input.registrationId}::uuid
          AND "eventId" = ${term.eventId}::uuid
        FOR UPDATE`;
      await tx.$queryRaw`
        SELECT "id" FROM "event_term" WHERE "id" = ${termId}::uuid FOR KEY SHARE`;
      await tx.$executeRaw`
        INSERT INTO "accommodation_term_state" ("termId", "eventId")
        VALUES (${termId}::uuid, ${term.eventId}::uuid)
        ON CONFLICT ("termId") DO NOTHING`;
      const [state] = await tx.$queryRaw<{ inputVersion: number }[]>`
        SELECT "inputVersion" FROM "accommodation_term_state"
        WHERE "termId" = ${termId}::uuid FOR UPDATE`;

      if (state?.inputVersion !== input.expectedVersion) {
        // Each move bumps the version, so one record at most was made on it.
        const made = await tx.accommodationIntervention.findFirst({
          where: {
            termId,
            kind: 'position',
            before: { path: ['inputVersion'], equals: input.expectedVersion },
          },
          select: {
            registrationId: true,
            actorId: true,
            reason: true,
            after: true,
          },
        });
        const after = made?.after as PositionAfter | undefined;
        const isSameRequest =
          made?.registrationId === input.registrationId &&
          made.actorId === input.actorId &&
          made.reason === input.reason &&
          after?.targetId === input.targetId &&
          after.placement === input.placement;
        return isSameRequest ? { kind: 'moved' } : { kind: 'stale' };
      }

      const row = await tx.eventTerm.findUniqueOrThrow({
        where: { id: termId },
        select: {
          accommodationOrder: { select: { registrationIds: true } },
          event: {
            select: {
              accommodationRules: {
                select: { hardAttribute: true, nonDeterminingValues: true },
              },
            },
          },
          registrationTerms: {
            where: { status: { in: ['pending', 'waitlisted'] } },
            select: {
              registration: {
                select: {
                  id: true,
                  receivedAt: true,
                  accommodationManualValue: {
                    select: { value: true, basedOnAnswer: true },
                  },
                },
              },
            },
          },
        },
      });
      const rules = row.event.accommodationRules;
      const hard = rules?.hardAttribute
        ? {
            attribute: rules.hardAttribute,
            nonDeterminingValues: rules.nonDeterminingValues,
          }
        : null;
      // The same answers the term view and the evaluation read.
      const answers = hard
        ? await this.answers.answers(
            term.eventId,
            hard.attribute,
            row.registrationTerms.map(({ registration }) => registration.id),
          )
        : new Map<string, string | null>();
      const people = row.registrationTerms.map(({ registration }) => ({
        registrationId: registration.id,
        receivedAt: registration.receivedAt,
        effectiveValue: hard
          ? effectiveValue(
              hard,
              answers.get(registration.id) ?? null,
              registration.accommodationManualValue,
            )
          : null,
      }));
      const order = termOrder(
        people,
        row.accommodationOrder?.registrationIds ?? null,
      );
      const result = moveInOrder(order, people, hard !== null, input);
      if (result.kind === 'refused') return result;
      const { move } = result;

      // The order and its record carry the same moment.
      const now = new Date();
      await tx.accommodationTermOrder.upsert({
        where: { termId },
        create: { termId, eventId: term.eventId, registrationIds: move.after },
        update: { registrationIds: move.after },
      });
      await tx.accommodationIntervention.create({
        data: {
          eventId: term.eventId,
          termId,
          registrationId: input.registrationId,
          kind: 'position',
          actorId: input.actorId,
          reason: input.reason,
          createdAt: now,
          before: {
            inputVersion: input.expectedVersion,
            queue: move.queue,
            order: move.before,
            queueOrder: move.queueBefore,
            position: move.fromPosition,
          } satisfies PositionBefore,
          after: {
            inputVersion: input.expectedVersion + 1,
            targetId: input.targetId,
            placement: input.placement,
            order: move.after,
            queueOrder: move.queueAfter,
            position: move.toPosition,
          } satisfies PositionAfter,
        },
      });
      await termInputsChanged(tx, term.eventId, [termId]);
      return { kind: 'moved' };
    });
  }

  /** The moves of a term, newest first; null for a term out of scope. */
  async findForTerm(
    scope: EventScope,
    termId: string,
  ): Promise<MoveRecord[] | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: { id: termId, eventId: scope.eventId, event: ownedEvent(scope) },
      select: { id: true },
    });
    if (!term) return null;
    return this.records({ termId, kind: 'position' }, scope.eventId);
  }

  /** The moves of one registration in any term, newest first. */
  async findForRegistration(
    eventId: string,
    registrationId: string,
  ): Promise<MoveRecord[]> {
    return this.records({ eventId, registrationId, kind: 'position' }, eventId);
  }

  private async records(
    where: Prisma.AccommodationInterventionWhereInput,
    eventId: string,
  ): Promise<MoveRecord[]> {
    const rows = await this.prisma.accommodationIntervention.findMany({
      where,
      orderBy: newestFirst,
      select: recordSelect,
    });
    const targetIds = [
      ...new Set(rows.map((row) => (row.after as PositionAfter).targetId)),
    ];
    const targets = await this.prisma.registration.findMany({
      where: { eventId, id: { in: targetIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const nameOf = new Map(targets.map(({ id, ...name }) => [id, name]));
    return rows.map((row) => toRecord(row, nameOf));
  }
}

function toRecord(row: RecordRow, nameOf: Map<string, Name>): MoveRecord {
  const before = row.before as PositionBefore;
  const after = row.after as PositionAfter;
  return {
    id: row.id,
    createdAt: row.createdAt,
    actor: row.actor,
    reason: row.reason,
    termId: row.termId as string,
    termLabel: row.term?.label ?? '',
    registrationId: row.registration.id,
    person: {
      firstName: row.registration.firstName,
      lastName: row.registration.lastName,
    },
    queue: before.queue,
    placement: after.placement,
    targetId: after.targetId,
    target: nameOf.get(after.targetId) ?? { firstName: '', lastName: '' },
    fromPosition: before.position,
    toPosition: after.position,
    inputVersion: before.inputVersion,
  };
}
