import { PrismaModule } from '@/core/prisma/prisma.module';
import { ParticipantAccessModule } from '@/modules/participant-access/participant-access.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventRegistrationsController } from './controllers/event-registrations.controller';
import { ParticipantRegistrationsController } from './controllers/participant-registrations.controller';
import { PaymentsController } from './controllers/payments.controller';
import { PublicRegistrationsController } from './controllers/public-registrations.controller';
import { EventRegistrationsRepository } from './repositories/event-registrations.repository';
import { ParticipantRegistrationsRepository } from './repositories/participant-registrations.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { RegistrationsRepository } from './repositories/registrations.repository';
import { EventRegistrationsService } from './services/event-registrations.service';
import { ParticipantRegistrationsService } from './services/participant-registrations.service';
import { PaymentsService } from './services/payments.service';
import { RegistrationConfirmationService } from './services/registration-confirmation.service';
import { RegistrationsService } from './services/registrations.service';

@Module({
  imports: [AuthModule, PrismaModule, ParticipantAccessModule],
  controllers: [
    PublicRegistrationsController,
    EventRegistrationsController,
    PaymentsController,
    ParticipantRegistrationsController,
  ],
  providers: [
    RegistrationsService,
    RegistrationConfirmationService,
    RegistrationsRepository,
    EventRegistrationsService,
    EventRegistrationsRepository,
    PaymentsService,
    PaymentsRepository,
    ParticipantRegistrationsService,
    ParticipantRegistrationsRepository,
  ],
})
export class RegistrationsModule {}
