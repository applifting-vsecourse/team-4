import { PrismaModule } from '@/core/prisma/prisma.module';
import { ParticipantAccessModule } from '@/modules/participant-access/participant-access.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { AccommodationRulesController } from './controllers/accommodation-rules.controller';
import { OrderMovesController } from './controllers/order-moves.controller';
import { ParticipantPlacementsController } from './controllers/participant-placements.controller';
import { RegistrationAccommodationController } from './controllers/registration-accommodation.controller';
import { RoomPlacementsController } from './controllers/room-placements.controller';
import { RoomProposalController } from './controllers/room-proposal.controller';
import { RoomPublicationController } from './controllers/room-publication.controller';
import { TermDecisionController } from './controllers/term-decision.controller';
import { TermEvaluationController } from './controllers/term-evaluation.controller';
import { AccommodationEvaluationRepository } from './repositories/accommodation-evaluation.repository';
import { AccommodationRulesRepository } from './repositories/accommodation-rules.repository';
import { EvaluationQueueRepository } from './repositories/evaluation-queue.repository';
import { OrderMovesRepository } from './repositories/order-moves.repository';
import { ParticipantPlacementsRepository } from './repositories/participant-placements.repository';
import { ProposalQueueRepository } from './repositories/proposal-queue.repository';
import { RegistrationAccommodationRepository } from './repositories/registration-accommodation.repository';
import { RoomPlacementsRepository } from './repositories/room-placements.repository';
import { RoomProposalRepository } from './repositories/room-proposal.repository';
import { RoomPublicationRepository } from './repositories/room-publication.repository';
import { TermDecisionRepository } from './repositories/term-decision.repository';
import { TermEvaluationRepository } from './repositories/term-evaluation.repository';
import { AccommodationEvaluationService } from './services/accommodation-evaluation.service';
import { AccommodationRulesService } from './services/accommodation-rules.service';
import { EvaluationWorker } from './services/evaluation-worker.service';
import {
  HardAttributeAnswers,
  RegistrationHardAttributeAnswers,
} from './services/hard-attribute-answers';
import { OrderMovesService } from './services/order-moves.service';
import { ParticipantPlacementsService } from './services/participant-placements.service';
import { ProposalWorker } from './services/proposal-worker.service';
import { RegistrationAccommodationService } from './services/registration-accommodation.service';
import { RoomPlacementsService } from './services/room-placements.service';
import {
  RoommateWishes,
  RoomPlacements,
  StoredRoommateWishes,
  StoredRoomPlacements,
} from './services/room-proposal-sources';
import { RoomProposalService } from './services/room-proposal.service';
import { RoomPublicationService } from './services/room-publication.service';
import { TermDecisionService } from './services/term-decision.service';
import { TermEvaluationService } from './services/term-evaluation.service';
import { TermRoomProposalService } from './services/term-room-proposal.service';

// Accommodation evaluation (S3-T4, S3-01, S3-03, #365, #384, #389): the
// rules and the term evaluation of the organizer, the manual order of a
// term, and the workers that run the due evaluations and room proposals.
// Manual room placement (F14-2, #337). Publication of the rooms of a term
// and the participant's own published room (S4-02, #341).
@Module({
  imports: [AuthModule, PrismaModule, ParticipantAccessModule],
  controllers: [
    AccommodationRulesController,
    OrderMovesController,
    ParticipantPlacementsController,
    RegistrationAccommodationController,
    RoomProposalController,
    RoomPlacementsController,
    RoomPublicationController,
    TermDecisionController,
    TermEvaluationController,
  ],
  providers: [
    AccommodationEvaluationService,
    AccommodationEvaluationRepository,
    AccommodationRulesRepository,
    AccommodationRulesService,
    EvaluationQueueRepository,
    EvaluationWorker,
    OrderMovesRepository,
    OrderMovesService,
    ParticipantPlacementsRepository,
    ParticipantPlacementsService,
    ProposalQueueRepository,
    ProposalWorker,
    RegistrationAccommodationRepository,
    RegistrationAccommodationService,
    RoomProposalRepository,
    RoomProposalService,
    RoomPlacementsRepository,
    RoomPlacementsService,
    RoomPublicationRepository,
    RoomPublicationService,
    TermDecisionRepository,
    TermDecisionService,
    TermEvaluationRepository,
    TermEvaluationService,
    TermRoomProposalService,
    {
      provide: HardAttributeAnswers,
      useClass: RegistrationHardAttributeAnswers,
    },
    // The saved placements (F14-2, #337) and wishes (S4-05, #339).
    { provide: RoomPlacements, useClass: StoredRoomPlacements },
    { provide: RoommateWishes, useClass: StoredRoommateWishes },
  ],
})
export class AccommodationModule {}
