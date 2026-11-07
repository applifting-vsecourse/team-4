import {
  EvaluationModeDto,
  RunEvidenceDto,
  RunListDto,
  TermEvaluationDto,
} from '@/modules/accommodation/dto/term-evaluation.dto';
import { TermEvaluationService } from '@/modules/accommodation/services/term-evaluation.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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

// Přihlášky → Vyhodnocení and Nastavení → Automatizace (S3-01): the term
// evaluation of an event. Every route is 404 for a foreign or missing
// organization, event, term or run.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/accommodation')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class TermEvaluationController {
  constructor(private readonly evaluation: TermEvaluationService) {}

  @Get('evaluation-mode')
  @ApiOperation({ summary: 'The evaluation mode of the event' })
  async mode(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EvaluationModeDto> {
    return {
      mode: await this.evaluation.mode({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    };
  }

  @Put('evaluation-mode')
  @ApiOperation({
    summary: 'Saves the evaluation mode',
    description:
      'It only decides what a later change does; it evaluates nothing itself.',
  })
  async saveMode(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: EvaluationModeDto,
  ): Promise<EvaluationModeDto> {
    return {
      mode: await this.evaluation.saveMode(
        { organizationId, ownerId: user.id, eventId },
        body.mode,
      ),
    };
  }

  @Get('terms/:termId/evaluation')
  @ApiOperation({
    summary: 'The evaluation of a term: proposal, queues, order and capacity',
    description:
      'The order and the queues are the term as it is now; the result of ' +
      'each person comes from the shown proposal. Reading never evaluates.',
  })
  async term(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<TermEvaluationDto> {
    return TermEvaluationDto.from(
      await this.evaluation.term(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Post('terms/:termId/evaluation')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Přepočítat: evaluates the term now, in either mode',
    description:
      'Queued: the response shows `running`; read the term again for the ' +
      'result. A running evaluation finishes first. Nothing is confirmed, ' +
      'owed or sent.',
  })
  @ApiResponse({ status: 202, type: TermEvaluationDto })
  async recalculate(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<TermEvaluationDto> {
    return TermEvaluationDto.from(
      await this.evaluation.recalculate(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Get('terms/:termId/runs')
  @ApiOperation({ summary: 'Every evaluation run of a term, newest first' })
  async runs(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<RunListDto> {
    return RunListDto.from(
      await this.evaluation.runs(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Get('runs/:runId')
  @ApiOperation({
    summary: 'The immutable evidence of one run',
    description:
      'What the run read (rules, rooms, confirmed, the order) and what it ' +
      'decided. A later change of the inputs never rewrites it.',
  })
  async run(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
  ): Promise<RunEvidenceDto> {
    return RunEvidenceDto.fromEvidence(
      await this.evaluation.run(
        { organizationId, ownerId: user.id, eventId },
        runId,
      ),
    );
  }
}
