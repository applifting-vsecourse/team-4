import { RegistrationDetailDto } from '@/modules/registrations/dto/managed-registration.dto';
import { PaymentInputDto } from '@/modules/registrations/dto/payment-input.dto';
import { PaymentsService } from '@/modules/registrations/services/payments.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
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
import type { Response } from 'express';

// Manual entry of a received payment into one registration (S2-12).
@ApiTags('registrations')
@ApiCookieAuth('better-auth.session_token')
@Controller(
  'organizations/:organizationId/events/:eventId/registrations/:registrationId/payments',
)
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Record a received payment',
    description:
      'Payments are append-only. A payment without an obligation is ' +
      'allowed and shows as an overpayment. 400 `received_on_future` for a ' +
      'date after today in Europe/Prague, 409 `submission_key_reused` for a ' +
      'key sent before with other content, 404 for a foreign or missing ' +
      'registration. Returns the registration with its recomputed balance.',
  })
  @ApiResponse({ status: 201, type: RegistrationDetailDto })
  @ApiResponse({
    status: 200,
    type: RegistrationDetailDto,
    description: 'A repeat of a saved request: nothing is added.',
  })
  async record(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() dto: PaymentInputDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RegistrationDetailDto> {
    const { created, registration } = await this.payments.record(
      { organizationId, ownerId: user.id, eventId },
      registrationId,
      dto,
    );
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return RegistrationDetailDto.from(registration);
  }
}
