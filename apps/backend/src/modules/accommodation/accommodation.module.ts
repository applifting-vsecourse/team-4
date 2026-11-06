import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { RegistrationAccommodationController } from './controllers/registration-accommodation.controller';
import { TermEvaluationController } from './controllers/term-evaluation.controller';
import { AccommodationEvaluationRepository } from './repositories/accommodation-evaluation.repository';
import { EvaluationQueueRepository } from './repositories/evaluation-queue.repository';
import { RegistrationAccommodationRepository } from './repositories/registration-accommodation.repository';
import { TermEvaluationRepository } from './repositories/term-evaluation.repository';
import { AccommodationEvaluationService } from './services/accommodation-evaluation.service';
import { EvaluationWorker } from './services/evaluation-worker.service';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from './services/hard-attribute-answers';
import { RegistrationAccommodationService } from './services/registration-accommodation.service';
import { TermEvaluationService } from './services/term-evaluation.service';

// Accommodation evaluation (S3-T4, S3-01): the term evaluation of the
// organizer and the worker that runs the due evaluations.
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RegistrationAccommodationController, TermEvaluationController],
  providers: [
    AccommodationEvaluationService,
    AccommodationEvaluationRepository,
    EvaluationQueueRepository,
    EvaluationWorker,
    RegistrationAccommodationRepository,
    RegistrationAccommodationService,
    TermEvaluationRepository,
    TermEvaluationService,
    {
      provide: HardAttributeAnswers,
      useClass: RegistrationHardAttributeAnswers,
    },
  ],
})
export class AccommodationModule {}
