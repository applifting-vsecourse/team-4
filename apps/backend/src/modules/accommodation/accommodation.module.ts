import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { OrderMovesController } from './controllers/order-moves.controller';
import { RegistrationAccommodationController } from './controllers/registration-accommodation.controller';
import { RoomProposalController } from './controllers/room-proposal.controller';
import { TermDecisionController } from './controllers/term-decision.controller';
import { TermEvaluationController } from './controllers/term-evaluation.controller';
import { AccommodationEvaluationRepository } from './repositories/accommodation-evaluation.repository';
import { EvaluationQueueRepository } from './repositories/evaluation-queue.repository';
import { OrderMovesRepository } from './repositories/order-moves.repository';
import { ProposalQueueRepository } from './repositories/proposal-queue.repository';
import { RegistrationAccommodationRepository } from './repositories/registration-accommodation.repository';
import { RoomProposalRepository } from './repositories/room-proposal.repository';
import { TermDecisionRepository } from './repositories/term-decision.repository';
import { TermEvaluationRepository } from './repositories/term-evaluation.repository';
import { AccommodationEvaluationService } from './services/accommodation-evaluation.service';
import { EvaluationWorker } from './services/evaluation-worker.service';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from './services/hard-attribute-answers';
import { OrderMovesService } from './services/order-moves.service';
import { ProposalWorker } from './services/proposal-worker.service';
import { RegistrationAccommodationService } from './services/registration-accommodation.service';
import {
  NoRoommateWishes,
  NoRoomPlacements,
  RoommateWishes,
  RoomPlacements,
} from './services/room-proposal-sources';
import { RoomProposalService } from './services/room-proposal.service';
import { TermDecisionService } from './services/term-decision.service';
import { TermEvaluationService } from './services/term-evaluation.service';
import { TermRoomProposalService } from './services/term-room-proposal.service';

// Accommodation evaluation (S3-T4, S3-01, S3-03, #384): the rules and the
// term evaluation of the organizer, the manual order of a term, and the
// worker that runs the due evaluations.
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    OrderMovesController,
    RegistrationAccommodationController,
    RoomProposalController,
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
    ProposalQueueRepository,
    ProposalWorker,
    RegistrationAccommodationRepository,
    RegistrationAccommodationService,
    RoomProposalRepository,
    RoomProposalService,
    TermDecisionRepository,
    TermDecisionService,
    TermEvaluationRepository,
    TermEvaluationService,
    TermRoomProposalService,
    {
      provide: HardAttributeAnswers,
      useClass: RegistrationHardAttributeAnswers,
    },
    // Placements and wishes come with #337 and #339.
    { provide: RoomPlacements, useClass: NoRoomPlacements },
    { provide: RoommateWishes, useClass: NoRoommateWishes },
  ],
})
export class AccommodationModule {}
