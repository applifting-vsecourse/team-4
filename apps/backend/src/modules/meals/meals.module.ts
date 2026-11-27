import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { MealsController } from './controllers/meals.controller';
import { MealsRepository } from './repositories/meals.repository';
import { MealsService } from './services/meals.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MealsController],
  providers: [MealsService, MealsRepository],
})
export class MealsModule {}
