import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ParticipantAccessController } from './controllers/participant-access.controller';
import { ParticipantSessionGuard } from './guards/participant-session.guard';
import { ParticipantAccessRepository } from './repositories/participant-access.repository';
import { ParticipantAccessService } from './services/participant-access.service';

/** Import this module to use `ParticipantSessionGuard` in participant endpoints. */
@Module({
  imports: [PrismaModule],
  controllers: [ParticipantAccessController],
  providers: [
    ParticipantAccessService,
    ParticipantAccessRepository,
    ParticipantSessionGuard,
  ],
  exports: [ParticipantAccessService, ParticipantSessionGuard],
})
export class ParticipantAccessModule {}
