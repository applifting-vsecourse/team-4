import { PrismaService } from '@/core/prisma/prisma.service';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  buildMealOverview,
  MealOverviewModel,
} from '@/modules/meals/domain/meal-overview';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MealsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The meal counts of one term of the caller's event; null for a foreign or
   * missing event or term. Only confirmed participation counts: a pending
   * change is not on the registration until it is approved.
   */
  async findOverview(
    scope: EventScope,
    termId: string,
  ): Promise<MealOverviewModel | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: {
        id: termId,
        eventId: scope.eventId,
        event: {
          organizationId: scope.organizationId,
          organization: { ownerId: scope.ownerId },
        },
      },
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
        registrationTerms: {
          where: { status: 'confirmed' },
          select: {
            registration: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                hasNoDietRestriction: true,
                diet: true,
                dietNote: true,
              },
            },
          },
        },
      },
    });
    if (!term) return null;
    return buildMealOverview(
      {
        id: term.id,
        label: term.label,
        startDate: fromDate(term.startDate),
        endDate: fromDate(term.endDate),
      },
      term.registrationTerms.map(({ registration }) => ({
        registrationId: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
        hasNoDietRestriction: registration.hasNoDietRestriction,
        diet: registration.diet,
        dietNote: registration.dietNote,
      })),
    );
  }
}
