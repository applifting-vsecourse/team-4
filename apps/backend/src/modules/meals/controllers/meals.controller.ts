import { MealOverviewDto } from '@/modules/meals/dto/meal-overview.dto';
import { MealsService } from '@/modules/meals/services/meals.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('meals')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/meals')
@UseGuards(AuthenticatedUserGuard)
export class MealsController {
  constructor(private readonly meals: MealsService) {}

  @Get(':termId')
  @ApiOperation({
    summary: 'Daily meal counts of a term by diet category (S5-04)',
    description:
      'Confirmed participants only, each counted once per day of the term. ' +
      '404 for a term of another organizer’s event or an unknown term.',
  })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<MealOverviewDto> {
    return MealOverviewDto.from(
      await this.meals.get(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }
}
