import { ProgrammeItemInput } from '@/modules/programme/domain/programme-item';
import { ProgrammeItemInputDto } from '@/modules/programme/dto/programme-item-input.dto';
import { ProgrammeDto } from '@/modules/programme/dto/programme.dto';
import { ProgrammeService } from '@/modules/programme/services/programme.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

const RULES =
  '404 `programme_unavailable` for a term or item of another event or ' +
  'organization, the same as a missing one; 400 `programme_date_out_of_term` ' +
  'for a day outside the term. Returns the programme read back.';

const toInput = (dto: ProgrammeItemInputDto): ProgrammeItemInput => ({
  title: dto.title,
  startDate: dto.startDate,
  startTime: dto.startTime,
  place: dto.place ?? null,
  description: dto.description ?? null,
});

// Organizer side of the term programme (F65).
@ApiTags('programme')
@ApiCookieAuth('better-auth.session_token')
@Controller(
  'organizations/:organizationId/events/:eventId/terms/:termId/programme',
)
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProgrammeController {
  constructor(private readonly programme: ProgrammeService) {}

  @Get()
  @ApiOperation({ summary: 'Programme of a term', description: RULES })
  async list(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<ProgrammeDto> {
    return ProgrammeDto.from(
      await this.programme.list(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Add a programme item', description: RULES })
  async add(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Body() dto: ProgrammeItemInputDto,
  ): Promise<ProgrammeDto> {
    return ProgrammeDto.from(
      await this.programme.add(
        { organizationId, ownerId: user.id, eventId },
        termId,
        toInput(dto),
      ),
    );
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Edit a programme item', description: RULES })
  async update(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ProgrammeItemInputDto,
  ): Promise<ProgrammeDto> {
    return ProgrammeDto.from(
      await this.programme.update(
        { organizationId, ownerId: user.id, eventId },
        termId,
        itemId,
        toInput(dto),
      ),
    );
  }

  @Delete(':itemId')
  @ApiOperation({ summary: 'Delete a programme item', description: RULES })
  async remove(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<ProgrammeDto> {
    return ProgrammeDto.from(
      await this.programme.remove(
        { organizationId, ownerId: user.id, eventId },
        termId,
        itemId,
      ),
    );
  }
}
