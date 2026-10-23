import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventRegistrationsController } from './controllers/event-registrations.controller';
import { PaymentsController } from './controllers/payments.controller';
import { PublicRegistrationsController } from './controllers/public-registrations.controller';
import { EventRegistrationsRepository } from './repositories/event-registrations.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { RegistrationsRepository } from './repositories/registrations.repository';
import { EventRegistrationsService } from './services/event-registrations.service';
import { PaymentsService } from './services/payments.service';
import { RegistrationsService } from './services/registrations.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    PublicRegistrationsController,
    EventRegistrationsController,
    PaymentsController,
  ],
  providers: [
    RegistrationsService,
    RegistrationsRepository,
    EventRegistrationsService,
    EventRegistrationsRepository,
    PaymentsService,
    PaymentsRepository,
  ],
})
export class RegistrationsModule {}
