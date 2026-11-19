import { PrismaModule } from '@/core/prisma/prisma.module';
import { ParticipantAccessModule } from '@/modules/participant-access/participant-access.module';
import { Module } from '@nestjs/common';
import { ParticipantProfileController } from './controllers/participant-profile.controller';
import { ParticipantProfileRepository } from './repositories/participant-profile.repository';
import { ParticipantProfileService } from './services/participant-profile.service';

@Module({
  imports: [PrismaModule, ParticipantAccessModule],
  controllers: [ParticipantProfileController],
  providers: [ParticipantProfileService, ParticipantProfileRepository],
})
export class ParticipantProfileModule {}
