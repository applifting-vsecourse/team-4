import {
  NotificationKind,
  NotificationTerm,
  ParticipantNotification,
} from '@/modules/participant-notifications/domain/participant-notification';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/** The ids of the notifications the participant was shown. */
export class MarkNotificationsReadDto {
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 1000 })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  ids!: string[];
}

const KINDS: NotificationKind[] = [
  'decision',
  'changeApproved',
  'changeRejected',
  'payment',
];

const STATUSES: ParticipationStatus[] = [
  'pending',
  'confirmed',
  'waitlisted',
  'cancelled',
];

export class NotificationTermDto {
  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({ enum: STATUSES, description: 'The state after the event.' })
  status!: ParticipationStatus;

  static from(term: NotificationTerm): NotificationTermDto {
    return Object.assign(new NotificationTermDto(), term);
  }
}

export class ParticipantNotificationDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The id of the saved decision, change request or payment.',
  })
  id!: string;

  @ApiProperty({
    enum: KINDS,
    description:
      '`decision`: the organizer decided terms; `changeApproved` / ' +
      '`changeRejected`: a change request was decided; `payment`: a payment ' +
      'was recorded.',
  })
  kind!: NotificationKind;

  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  eventName!: string;

  @ApiProperty({ format: 'date-time', description: 'When it was saved.' })
  at!: string;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty({
    type: [NotificationTermDto],
    description:
      'The terms a decision or request touched; empty for a payment and for ' +
      'a request that changed no term.',
  })
  terms!: NotificationTermDto[];

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The received amount in haléře; only for a payment.',
  })
  amountMinor!: number | null;

  static from(model: ParticipantNotification): ParticipantNotificationDto {
    return Object.assign(new ParticipantNotificationDto(), {
      id: model.id,
      kind: model.kind,
      registrationId: model.registrationId,
      eventName: model.eventName,
      at: model.at.toISOString(),
      isRead: model.isRead,
      terms: model.terms.map((term) => NotificationTermDto.from(term)),
      amountMinor: model.amountMinor,
    });
  }
}

export class ParticipantNotificationListDto {
  @ApiProperty({
    type: [ParticipantNotificationDto],
    description: 'Not dismissed, newest first.',
  })
  items!: ParticipantNotificationDto[];

  static from(
    models: ParticipantNotification[],
  ): ParticipantNotificationListDto {
    return Object.assign(new ParticipantNotificationListDto(), {
      items: models.map((model) => ParticipantNotificationDto.from(model)),
    });
  }
}
