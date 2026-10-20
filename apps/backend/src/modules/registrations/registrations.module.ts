import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { PublicRegistrationsController } from './controllers/public-registrations.controller';
import { RegistrationsRepository } from './repositories/registrations.repository';
import { RegistrationsService } from './services/registrations.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicRegistrationsController],
  providers: [RegistrationsService, RegistrationsRepository],
})
export class RegistrationsModule {}
