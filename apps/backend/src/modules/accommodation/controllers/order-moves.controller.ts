import {
  MoveInOrderDto,
  MoveRecordDto,
} from '@/modules/accommodation/dto/order-moves.dto';
import { TermEvaluationDto } from '@/modules/accommodation/dto/term-evaluation.dto';
import { OrderMovesService } from '@/modules/accommodation/services/order-moves.service';
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

// Přihlášky → Vyhodnocení → fronta → Změnit pořadí (S3-03, F39-1): the
// manual order of a term and its audit. Every route is 404 for a foreign or
// missing organization, event or term.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller(
  'organizations/:organizationId/events/:eventId/accommodation/terms/:termId/order/moves',
)
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class OrderMovesController {
  constructor(private readonly moves: OrderMovesService) {}

  @Get()
  @ApiResponse({ status: 200, type: [MoveRecordDto] })
  @ApiOperation({
    summary: 'Every manual change of the term order, newest first',
  })
  async list(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<MoveRecordDto[]> {
    const moves = await this.moves.moves(
      { organizationId, ownerId: user.id, eventId },
      termId,
    );
    return moves.map(MoveRecordDto.from);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Places an unconfirmed person right before or after another one',
    description:
      'Within the person’s queue, with a reason, recorded immutably. The ' +
      'term’s proposal turns stale; nothing is confirmed, owed, released or ' +
      'sent. Other terms keep their order. 409 `order_stale` when the term ' +
      'changed since `expectedVersion`.',
  })
  @ApiResponse({ status: 200, type: TermEvaluationDto })
  async move(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Body() body: MoveInOrderDto,
  ): Promise<TermEvaluationDto> {
    return TermEvaluationDto.from(
      await this.moves.move(
        { organizationId, ownerId: user.id, eventId },
        termId,
        body,
      ),
    );
  }
}
