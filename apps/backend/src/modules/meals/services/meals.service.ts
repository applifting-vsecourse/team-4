import { EventScope } from '@/modules/events/repositories/events.repository';
import { MealOverviewModel } from '@/modules/meals/domain/meal-overview';
import { MealsRepository } from '@/modules/meals/repositories/meals.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MealsService {
  constructor(private readonly repository: MealsRepository) {}

  /** A foreign event or term looks the same as a missing one (S2-03). */
  async get(scope: EventScope, termId: string): Promise<MealOverviewModel> {
    const overview = await this.repository.findOverview(scope, termId);
    if (!overview) throw new NotFoundException('Záznam není dostupný');
    return overview;
  }
}
