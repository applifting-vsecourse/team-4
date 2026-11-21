import { PrismaModule } from '@/core/prisma/prisma.module';
import { ParticipantAccessModule } from '@/modules/participant-access/participant-access.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventPaymentsController } from './controllers/event-payments.controller';
import { EventRegistrationsController } from './controllers/event-registrations.controller';
import { EventRoommateWishesController } from './controllers/event-roommate-wishes.controller';
import { ParticipantRegistrationsController } from './controllers/participant-registrations.controller';
import { ParticipantRoommateWishesController } from './controllers/participant-roommate-wishes.controller';
import { PaymentsController } from './controllers/payments.controller';
import { PublicRegistrationsController } from './controllers/public-registrations.controller';
import { QrPaymentsController } from './controllers/qr-payments.controller';
import { RegistrationChangesController } from './controllers/registration-changes.controller';
import { EventRegistrationsRepository } from './repositories/event-registrations.repository';
import { ParticipantRegistrationsRepository } from './repositories/participant-registrations.repository';
import { ParticipantUpdatesRepository } from './repositories/participant-updates.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { QrPaymentsRepository } from './repositories/qr-payments.repository';
import { RegistrationChangesRepository } from './repositories/registration-changes.repository';
import { RegistrationsRepository } from './repositories/registrations.repository';
import { RoommateWishesRepository } from './repositories/roommate-wishes.repository';
import { EventPaymentsService } from './services/event-payments.service';
import { EventRegistrationsService } from './services/event-registrations.service';
import { ParticipantRegistrationsService } from './services/participant-registrations.service';
import { ParticipantResultMailService } from './services/participant-result-mail.service';
import { ParticipantUpdateService } from './services/participant-update.service';
import { PaymentsService } from './services/payments.service';
import { QrPaymentsService } from './services/qr-payments.service';
import { RegistrationChangesService } from './services/registration-changes.service';
import { RegistrationConfirmationService } from './services/registration-confirmation.service';
import { RegistrationsService } from './services/registrations.service';
import { RoommateWishesService } from './services/roommate-wishes.service';

@Module({
  imports: [AuthModule, PrismaModule, ParticipantAccessModule],
  controllers: [
    PublicRegistrationsController,
    EventRegistrationsController,
    EventPaymentsController,
    PaymentsController,
    ParticipantRegistrationsController,
    RegistrationChangesController,
    QrPaymentsController,
    ParticipantRoommateWishesController,
    EventRoommateWishesController,
  ],
  providers: [
    RegistrationsService,
    RegistrationConfirmationService,
    ParticipantUpdateService,
    ParticipantUpdatesRepository,
    ParticipantResultMailService,
    RegistrationsRepository,
    EventRegistrationsService,
    EventRegistrationsRepository,
    EventPaymentsService,
    PaymentsService,
    PaymentsRepository,
    ParticipantRegistrationsService,
    ParticipantRegistrationsRepository,
    RegistrationChangesService,
    RegistrationChangesRepository,
    QrPaymentsService,
    QrPaymentsRepository,
    RoommateWishesService,
    RoommateWishesRepository,
  ],
  // Bank pairing (F24) tells the participant about a received payment.
  exports: [ParticipantUpdateService],
})
export class RegistrationsModule {}
