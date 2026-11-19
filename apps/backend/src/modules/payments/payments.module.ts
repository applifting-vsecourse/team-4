import { PrismaModule } from '@/core/prisma/prisma.module';
import { RegistrationsModule } from '@/modules/registrations/registrations.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { BankTransactionsController } from './controllers/bank-transactions.controller';
import { BankTransactionsRepository } from './repositories/bank-transactions.repository';
import { BankTransactionsService } from './services/bank-transactions.service';

// Správa akce → Platby: imported bank statements (F23) and their pairing with
// registrations (F24), which tells the participants through their updates.
@Module({
  imports: [AuthModule, PrismaModule, RegistrationsModule],
  controllers: [BankTransactionsController],
  providers: [BankTransactionsService, BankTransactionsRepository],
})
export class PaymentsModule {}
