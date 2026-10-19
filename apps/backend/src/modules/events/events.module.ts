import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { EventTermsController } from './controllers/event-terms.controller';
import { EventsController } from './controllers/events.controller';
import { EventsRepository } from './repositories/events.repository';
import { EventsService } from './services/events.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [EventsController, EventTermsController],
  providers: [EventsService, EventsRepository],
})
export class EventsModule {}
