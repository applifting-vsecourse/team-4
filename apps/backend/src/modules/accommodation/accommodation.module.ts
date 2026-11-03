import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { AccommodationEvaluationRepository } from './repositories/accommodation-evaluation.repository';
import { AccommodationEvaluationService } from './services/accommodation-evaluation.service';
import {
  HardAttributeAnswers,
  NoHardAttributeAnswers,
} from './services/hard-attribute-answers';

// Accommodation evaluation (S3-T4). No endpoint yet: F13-1 calls the service
// when it creates a proposal for the organizer.
@Module({
  imports: [PrismaModule],
  providers: [
    AccommodationEvaluationService,
    AccommodationEvaluationRepository,
    { provide: HardAttributeAnswers, useClass: NoHardAttributeAnswers },
  ],
  exports: [AccommodationEvaluationService],
})
export class AccommodationModule {}
