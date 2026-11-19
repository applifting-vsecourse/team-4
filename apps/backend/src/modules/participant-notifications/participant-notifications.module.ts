import { PrismaModule } from '@/core/prisma/prisma.module';
import { ParticipantAccessModule } from '@/modules/participant-access/participant-access.module';
import { Module } from '@nestjs/common';
import { ParticipantNotificationsController } from './controllers/participant-notifications.controller';
import { ParticipantNotificationsRepository } from './repositories/participant-notifications.repository';
import { ParticipantNotificationsService } from './services/participant-notifications.service';

@Module({
  imports: [PrismaModule, ParticipantAccessModule],
  controllers: [ParticipantNotificationsController],
  providers: [
    ParticipantNotificationsService,
    ParticipantNotificationsRepository,
  ],
})
export class ParticipantNotificationsModule {}
