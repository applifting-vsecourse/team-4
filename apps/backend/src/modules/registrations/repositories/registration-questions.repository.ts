import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { lockedRules } from '@/modules/accommodation/repositories/accommodation-rules.repository';
import { ownedEvent } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  planQuestions,
  Question,
  QuestionDraft,
  QuestionsError,
  QuestionUsage,
} from '@/modules/registrations/domain/questions';
import { Injectable } from '@nestjs/common';

type Db = Prisma.TransactionClient;

/** A question in Nastavení, with what keeps it from being removed. */
export type ManagedQuestion = Omit<Question, 'options'> & {
  isAnswered: boolean;
  /** How the accommodation rules use it; null when they don't. */
  usedBy: 'hard' | 'soft' | null;
  options: (Question['options'][number] & { isChosen: boolean })[];
};

export type QuestionsSave =
  | { kind: 'saved'; questions: ManagedQuestion[] }
  | { kind: 'refused'; error: QuestionsError }
  | { kind: 'not_found' };

const order = [{ position: 'asc' as const }, { id: 'asc' as const }];

/** What a query selects of an event's questions, in form order, as `Question`s. */
export const questionSelect = {
  orderBy: order,
  select: {
    id: true,
    label: true,
    isRequired: true,
    options: { orderBy: order, select: { id: true, label: true } },
  },
};

/** The questions of an event in form order. */
export async function questionsOf(
  db: Db,
  eventId: string,
): Promise<Question[]> {
  return db.registrationQuestion.findMany({
    where: { eventId },
    ...questionSelect,
  });
}

async function usageOf(
  db: Db,
  eventId: string,
  rules: { hardAttribute: string | null; softAttributes: readonly string[] },
): Promise<QuestionUsage> {
  const answered = await db.registrationAnswer.groupBy({
    by: ['questionId', 'optionId'],
    where: { eventId },
  });
  const usedBy = new Map<string, 'hard' | 'soft'>();
  for (const id of rules.softAttributes) usedBy.set(id, 'soft');
  if (rules.hardAttribute) usedBy.set(rules.hardAttribute, 'hard');
  return {
    answeredQuestionIds: new Set(answered.map((row) => row.questionId)),
    chosenOptionIds: new Set(answered.map((row) => row.optionId)),
    usedBy,
  };
}

const managed = (
  questions: Question[],
  usage: QuestionUsage,
): ManagedQuestion[] =>
  questions.map((question) => ({
    ...question,
    isAnswered: usage.answeredQuestionIds.has(question.id),
    usedBy: usage.usedBy.get(question.id) ?? null,
    options: question.options.map((option) => ({
      ...option,
      isChosen: usage.chosenOptionIds.has(option.id),
    })),
  }));

/** Nastavení → Otázky v přihlášce (#485). */
@Injectable()
export class RegistrationQuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Undefined for an event outside the caller's organizations. */
  async find(scope: EventScope): Promise<ManagedQuestion[] | undefined> {
    const event = await this.prisma.event.findFirst({
      where: ownedEvent(scope),
      select: {
        accommodationRules: {
          select: { hardAttribute: true, softAttributes: true },
        },
      },
    });
    if (!event) return undefined;
    const questions = await questionsOf(this.prisma, scope.eventId);
    const usage = await usageOf(this.prisma, scope.eventId, {
      hardAttribute: event.accommodationRules?.hardAttribute ?? null,
      softAttributes: event.accommodationRules?.softAttributes ?? [],
    });
    return managed(questions, usage);
  }

  /**
   * Replaces the questions with the organizer's list, or nothing. Under the
   * accommodation rules' lock, which choosing a hard attribute or soft
   * preferences takes too, so a question in use is never removed. Answers
   * stay: a renamed option keeps its id, and an answered question or
   * chosen option is never removed.
   */
  async save(
    scope: EventScope,
    drafts: readonly QuestionDraft[],
  ): Promise<QuestionsSave> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: ownedEvent(scope),
        select: { id: true },
      });
      if (!event) return { kind: 'not_found' };
      // Also one save at a time per event: the positions are rewritten whole.
      const rules = await lockedRules(tx, scope.eventId);
      const current = await questionsOf(tx, scope.eventId);
      const usage = await usageOf(tx, scope.eventId, rules);
      const plan = planQuestions(current, drafts, usage);
      if ('code' in plan) return { kind: 'refused', error: plan };

      if (plan.removedOptionIds.length > 0)
        await tx.registrationQuestionOption.deleteMany({
          where: { id: { in: plan.removedOptionIds } },
        });
      if (plan.removedQuestionIds.length > 0)
        await tx.registrationQuestion.deleteMany({
          where: { id: { in: plan.removedQuestionIds } },
        });
      for (const [position, question] of plan.questions.entries()) {
        const data = {
          position,
          label: question.label,
          isRequired: question.isRequired,
        };
        const id = question.id
          ? (
              await tx.registrationQuestion.update({
                where: { id: question.id },
                data,
                select: { id: true },
              })
            ).id
          : (
              await tx.registrationQuestion.create({
                data: { ...data, eventId: scope.eventId },
                select: { id: true },
              })
            ).id;
        for (const [optionPosition, option] of question.options.entries()) {
          const optionData = { position: optionPosition, label: option.label };
          if (option.id)
            await tx.registrationQuestionOption.update({
              where: { id: option.id },
              data: optionData,
            });
          else
            await tx.registrationQuestionOption.create({
              data: { ...optionData, questionId: id },
            });
        }
      }
      return {
        kind: 'saved',
        questions: managed(await questionsOf(tx, scope.eventId), usage),
      };
    });
  }
}
