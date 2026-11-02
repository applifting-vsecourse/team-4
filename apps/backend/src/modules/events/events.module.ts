import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventChangeApprovalController } from './controllers/event-change-approval.controller';
import { EventPaymentSettingsController } from './controllers/event-payment-settings.controller';
import { EventTermsController } from './controllers/event-terms.controller';
import { EventsController } from './controllers/events.controller';
import { PublicEventsController } from './controllers/public-events.controller';
import { EventsRepository } from './repositories/events.repository';
import { EventsService } from './services/events.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    EventsController,
    EventTermsController,
    EventChangeApprovalController,
    EventPaymentSettingsController,
    PublicEventsController,
  ],
  providers: [EventsService, EventsRepository],
})
export class EventsModule {}
