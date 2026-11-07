import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { OrderMovesController } from './controllers/order-moves.controller';
import { RegistrationAccommodationController } from './controllers/registration-accommodation.controller';
import { TermDecisionController } from './controllers/term-decision.controller';
import { TermEvaluationController } from './controllers/term-evaluation.controller';
import { AccommodationEvaluationRepository } from './repositories/accommodation-evaluation.repository';
import { EvaluationQueueRepository } from './repositories/evaluation-queue.repository';
import { OrderMovesRepository } from './repositories/order-moves.repository';
import { RegistrationAccommodationRepository } from './repositories/registration-accommodation.repository';
import { TermDecisionRepository } from './repositories/term-decision.repository';
import { TermEvaluationRepository } from './repositories/term-evaluation.repository';
import { AccommodationEvaluationService } from './services/accommodation-evaluation.service';
import { EvaluationWorker } from './services/evaluation-worker.service';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from './services/hard-attribute-answers';
import { OrderMovesService } from './services/order-moves.service';
import { RegistrationAccommodationService } from './services/registration-accommodation.service';
import { TermDecisionService } from './services/term-decision.service';
import { TermEvaluationService } from './services/term-evaluation.service';

// Accommodation evaluation (S3-T4, S3-01, S3-03): the term evaluation of the
// organizer, the manual order of a term, and the worker that runs the due
// evaluations.
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    OrderMovesController,
    RegistrationAccommodationController,
    TermDecisionController,
    TermEvaluationController,
  ],
  providers: [
    AccommodationEvaluationService,
    AccommodationEvaluationRepository,
    EvaluationQueueRepository,
    EvaluationWorker,
    OrderMovesRepository,
    OrderMovesService,
    RegistrationAccommodationRepository,
    RegistrationAccommodationService,
    TermDecisionRepository,
    TermDecisionService,
    TermEvaluationRepository,
    TermEvaluationService,
    {
      provide: HardAttributeAnswers,
      useClass: RegistrationHardAttributeAnswers,
    },
  ],
})
export class AccommodationModule {}
