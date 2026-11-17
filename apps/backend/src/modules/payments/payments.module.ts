import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { BankTransactionsController } from './controllers/bank-transactions.controller';
import { BankTransactionsRepository } from './repositories/bank-transactions.repository';
import { BankTransactionsService } from './services/bank-transactions.service';

// Správa akce → Platby: imported bank statements (F23).
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [BankTransactionsController],
  providers: [BankTransactionsService, BankTransactionsRepository],
})
export class PaymentsModule {}
