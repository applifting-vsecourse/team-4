import { PrismaModule } from '@/core/prisma/prisma.module';
import { ParticipantAccessModule } from '@/modules/participant-access/participant-access.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { ParticipantProgrammeController } from './controllers/participant-programme.controller';
import { ProgrammeController } from './controllers/programme.controller';
import { ProgrammeRepository } from './repositories/programme.repository';
import { ProgrammeService } from './services/programme.service';

@Module({
  imports: [AuthModule, PrismaModule, ParticipantAccessModule],
  controllers: [ProgrammeController, ParticipantProgrammeController],
  providers: [ProgrammeService, ProgrammeRepository],
})
export class ProgrammeModule {}
