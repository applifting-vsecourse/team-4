import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { QuacksController } from './controllers/quacks.controller';
import { QuackRepository } from './repositories/quack.repository';
import { QuacksService } from './services/quacks.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [QuacksController],
  providers: [QuacksService, QuackRepository],
  exports: [QuacksService],
})
export class QuackModule {}
