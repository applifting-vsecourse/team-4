import { RegistrationInputDto } from '@/modules/registrations/dto/registration-input.dto';
import { RegistrationResultDto } from '@/modules/registrations/dto/registration-result.dto';
import { RegistrationsService } from '@/modules/registrations/services/registrations.service';
import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

// Same shape as the public event link (S2-06): anything else cannot match.
const PUBLIC_ID = /^[A-Za-z0-9_-]{1,32}$/;

@ApiTags('public events')
@Controller('public/events/:publicId/registrations')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PublicRegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a registration through the public link',
    description:
      'No sign-in. Each term is confirmed if it has a free bed at the moment ' +
      'of saving, otherwise waitlisted; a full event is not an error. 404 ' +
      '`event_unavailable` for an unknown link and for an event that is not ' +
      'open, 400 `term_unknown` for a term of another event, 409 ' +
      '`already_registered` for an e-mail registered for this event, 409 ' +
      '`submission_key_reused` for a key sent before with other content.',
  })
  @ApiResponse({ status: 201, type: RegistrationResultDto })
  @ApiResponse({
    status: 200,
    type: RegistrationResultDto,
    description:
      'A repeat of a saved submission: its stored result, unchanged.',
  })
  async submit(
    @Param('publicId') publicId: string,
    @Body() dto: RegistrationInputDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RegistrationResultDto> {
    if (!PUBLIC_ID.test(publicId)) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'event_unavailable',
        message: 'Přihlašování na tuto akci není dostupné.',
      });
    }
    const { created, result } = await this.registrations.submit(publicId, dto);
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return RegistrationResultDto.from(result);
  }
}
