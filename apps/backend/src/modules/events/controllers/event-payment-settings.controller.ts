import { EventDetailDto } from '@/modules/events/dto/event.dto';
import { PaymentSettingsInputDto } from '@/modules/events/dto/payment-settings-input.dto';
import { EventsService } from '@/modules/events/services/events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UsePipes,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Puts the first rejected field into the body, so the form can show the
// message at the right input (same shape as the term errors).
const fieldError = (errors: ValidationError[]): BadRequestException => {
  const first = errors[0];
  return new BadRequestException({
    statusCode: 400,
    code: 'payment_settings_invalid',
    field: first?.property,
    message: Object.values(first?.constraints ?? {})[0] ?? 'Neplatný údaj.',
  });
};

@ApiTags('events')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/payment-settings')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: fieldError,
  }),
)
export class EventPaymentSettingsController {
  constructor(private readonly events: EventsService) {}

  @Put()
  @ApiOperation({
    summary: 'Set the account and due days for new registrations',
    description:
      'Allowed at any time, also after registration has been opened. ' +
      'Registrations already received keep their own copy. ' +
      '400 with `field` for an invalid value (`bank_account_invalid` for a ' +
      'failed account checksum). Returns the event.',
  })
  async update(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: PaymentSettingsInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.updatePaymentSettings(
        { organizationId, ownerId: user.id, eventId },
        {
          bankAccountPrefix: dto.bankAccountPrefix ?? null,
          bankAccountNumber: dto.bankAccountNumber,
          bankCode: dto.bankCode,
          paymentDueDays: dto.paymentDueDays,
        },
      ),
    );
  }
}
