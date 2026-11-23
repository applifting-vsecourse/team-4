import {
  EventQuestionsDto,
  SaveEventQuestionsDto,
} from '@/modules/registrations/dto/registration-questions.dto';
import { RegistrationQuestionsService } from '@/modules/registrations/services/registration-questions.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// Správa akce → Nastavení → Otázky v přihlášce (#485): the categorical
// questions of the event's registration form. 404 for a foreign or missing
// event.
@ApiTags('registrations')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/questions')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RegistrationQuestionsController {
  constructor(private readonly questions: RegistrationQuestionsService) {}

  @Get()
  @ApiOperation({
    summary: 'The categorical questions of the registration form',
  })
  @ApiResponse({ status: 200, type: EventQuestionsDto })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EventQuestionsDto> {
    return EventQuestionsDto.from(
      await this.questions.questions({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Saves the questions, all of them or nothing',
    description:
      'At most 5 questions with 2–10 options each (400 `questions_invalid`). ' +
      'Renaming and adding options is always allowed. 409 ' +
      '`question_answered` / `option_chosen` for removing an answered ' +
      'question or a chosen option, `question_in_use` for one the ' +
      'accommodation rules use, `questions_changed` for ids that are no ' +
      'longer the event’s.',
  })
  @ApiResponse({ status: 200, type: EventQuestionsDto })
  async save(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: SaveEventQuestionsDto,
  ): Promise<EventQuestionsDto> {
    return EventQuestionsDto.from(
      await this.questions.save(
        { organizationId, ownerId: user.id, eventId },
        body.questions,
      ),
    );
  }
}
