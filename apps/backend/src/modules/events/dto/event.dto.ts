import {
  EventDetailModel,
  EventStatus,
  EventSummaryModel,
  EventTermModel,
  OpeningBlocker,
  PublicCatalogEventModel,
  PublicCatalogItemModel,
  PublicEventModel,
  PublicRegistrationStatus,
} from '@/modules/events/domain/event';
import { PaymentSettings } from '@/modules/events/domain/payment-settings';
import { PublicContact } from '@/modules/events/domain/presentation';
import { questionsVersion } from '@/modules/registrations/domain/questions';
import { FormQuestionDto } from '@/modules/registrations/dto/registration-questions.dto';
import { ApiProperty } from '@nestjs/swagger';

const STATUSES: EventStatus[] = ['draft', 'open', 'closed'];
const BLOCKERS: OpeningBlocker[] = [
  'name',
  'description',
  'location',
  'terms',
  'paymentSettings',
];

export class EventTermDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date', example: '2027-07-01' })
  startDate!: string;

  @ApiProperty({ format: 'date', example: '2027-07-07' })
  endDate!: string;

  @ApiProperty({ description: 'Price in haléře (CZK × 100).' })
  priceMinor!: number;

  @ApiProperty({
    description: 'Beds of the rooms available in the term; 0 without rooms.',
  })
  capacity!: number;

  @ApiProperty({ description: 'Items in the programme of the term (F65).' })
  programmeItemCount!: number;

  static from(model: EventTermModel): EventTermDto {
    return {
      id: model.id,
      label: model.label,
      startDate: model.startDate,
      endDate: model.endDate,
      priceMinor: model.priceMinor,
      capacity: model.capacity,
      programmeItemCount: model.programmeItemCount,
    };
  }
}

export class EventPeriodDto {
  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;
}

export class EventSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ enum: STATUSES })
  status!: EventStatus;

  @ApiProperty()
  termCount!: number;

  @ApiProperty({
    type: EventPeriodDto,
    nullable: true,
    description: 'First start and last end over all terms.',
  })
  period!: EventPeriodDto | null;

  static from(model: EventSummaryModel): EventSummaryDto {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      location: model.location,
      status: model.status,
      termCount: model.termCount,
      period: model.period
        ? { startDate: model.period.startDate, endDate: model.period.endDate }
        : null,
    };
  }
}

export class PaymentSettingsDto {
  @ApiProperty({ type: String, nullable: true, example: '19' })
  bankAccountPrefix!: string | null;

  @ApiProperty({ example: '2000145399' })
  bankAccountNumber!: string;

  @ApiProperty({ example: '0800' })
  bankCode!: string;

  @ApiProperty({ description: 'Days from confirmation to the reminder date.' })
  paymentReminderDays!: number;

  static from(model: PaymentSettings): PaymentSettingsDto {
    return {
      bankAccountPrefix: model.bankAccountPrefix,
      bankAccountNumber: model.bankAccountNumber,
      bankCode: model.bankCode,
      paymentReminderDays: model.paymentReminderDays,
    };
  }
}

export class PublicContactDto {
  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '+420604123456' })
  phone!: string | null;

  static from(model: PublicContact | null): PublicContactDto | null {
    return model
      ? { name: model.name, email: model.email, phone: model.phone }
      : null;
  }
}

export class EventPhotoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

export class EventDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ enum: STATUSES })
  status!: EventStatus;

  @ApiProperty({
    description:
      'True from the first opening of registration on, even after closing. ' +
      'Name, location and terms cannot change through the event basics endpoint then; ' +
      'the public presentation description remains editable.',
  })
  isLocked!: boolean;

  @ApiProperty({ type: [EventTermDto], description: 'Sorted by start date.' })
  terms!: EventTermDto[];

  @ApiProperty({
    type: PaymentSettingsDto,
    nullable: true,
    description:
      'Account and reminder days applied to registrations received from now on; ' +
      'null until completed. Existing registrations keep their own copy.',
  })
  paymentSettings!: PaymentSettingsDto | null;

  @ApiProperty({
    description: 'Part of the public link `/e/:publicId`; never changes.',
  })
  publicId!: string;

  @ApiProperty({
    description:
      'Listed in the public catalog. Independent of the registration status.',
  })
  isPublished!: boolean;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Registration changes need the organizer's approval from this many days " +
      'before the start of an affected term (Europe/Prague); null = no approval.',
  })
  changeApprovalDays!: number | null;

  @ApiProperty({ description: 'One condition per line; empty without any.' })
  conditions!: string;

  @ApiProperty({
    type: PublicContactDto,
    nullable: true,
    description: 'Public contact on the catalog detail; null when left empty.',
  })
  contact!: PublicContactDto | null;

  @ApiProperty({ type: [EventPhotoDto], description: 'Oldest first.' })
  photos!: EventPhotoDto[];

  @ApiProperty({
    enum: BLOCKERS,
    isArray: true,
    description:
      'What is still missing before registration can be opened; empty when ' +
      'it can be. The server checks it again when opening.',
  })
  openingBlockers!: OpeningBlocker[];

  static from(model: EventDetailModel): EventDetailDto {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      location: model.location,
      status: model.status,
      isLocked: model.isLocked,
      terms: model.terms.map(EventTermDto.from),
      paymentSettings: model.paymentSettings
        ? PaymentSettingsDto.from(model.paymentSettings)
        : null,
      publicId: model.publicId,
      isPublished: model.isPublished,
      changeApprovalDays: model.changeApprovalDays,
      conditions: model.conditions,
      contact: PublicContactDto.from(model.contact),
      photos: model.photoIds.map((id) => ({ id })),
      openingBlockers: model.openingBlockers,
    };
  }
}

export class PublicEventTermDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({ description: 'Price in haléře (CZK × 100).' })
  priceMinor!: number;
}

/** No ids of the organization, no capacity, no payment settings. */
export class PublicEventDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ type: [PublicEventTermDto], description: 'By start date.' })
  terms!: PublicEventTermDto[];

  @ApiProperty({
    description: 'Listed in the catalog, so the form can link to the detail.',
  })
  isPublished!: boolean;

  @ApiProperty({
    description:
      'Participation terms (F07), possibly with cancellation information. ' +
      'Empty when the event has none; a registration then needs no confirmation.',
  })
  conditions!: string;

  @ApiProperty({
    type: [FormQuestionDto],
    description:
      'The categorical questions of the form (#485), in form order; ' +
      'answers go with the registration.',
  })
  questions!: FormQuestionDto[];

  @ApiProperty({
    description:
      'Version of the questions as shown; the form sends it back with the ' +
      'registration (#485).',
  })
  questionsVersion!: string;

  @ApiProperty({
    description:
      'Rooms are split by gender, so the form requires a gender answer; ' +
      '"undisclosed" counts as one.',
  })
  isGenderRequired!: boolean;

  static from(model: PublicEventModel): PublicEventDto {
    return {
      name: model.name,
      description: model.description,
      location: model.location,
      terms: model.terms.map((term) => ({
        id: term.id,
        label: term.label,
        startDate: term.startDate,
        endDate: term.endDate,
        priceMinor: term.priceMinor,
      })),
      isPublished: model.isPublished,
      conditions: model.conditions,
      questions: model.questions.map(FormQuestionDto.from),
      questionsVersion: questionsVersion(model),
      isGenderRequired: model.isGenderRequired,
    };
  }
}

const REGISTRATION_STATUSES: PublicRegistrationStatus[] = [
  'open',
  'not-open',
  'closed',
];

/** The catalog detail (F55): no capacity, registrations or internal data. */
export class PublicCatalogEventDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ description: 'One condition per line; empty without any.' })
  conditions!: string;

  @ApiProperty({ type: PublicContactDto, nullable: true })
  contact!: PublicContactDto | null;

  @ApiProperty({
    type: [EventPhotoDto],
    description:
      'Oldest first; served at `public/catalog/events/:publicId/photos/:id`.',
  })
  photos!: EventPhotoDto[];

  @ApiProperty({
    enum: REGISTRATION_STATUSES,
    description: '`not-open` before the first opening.',
  })
  registrationStatus!: PublicRegistrationStatus;

  @ApiProperty({ type: [PublicEventTermDto], description: 'By start date.' })
  terms!: PublicEventTermDto[];

  static from(model: PublicCatalogEventModel): PublicCatalogEventDto {
    return {
      name: model.name,
      organizationName: model.organizationName,
      description: model.description,
      location: model.location,
      conditions: model.conditions,
      contact: PublicContactDto.from(model.contact),
      photos: model.photoIds.map((id) => ({ id })),
      registrationStatus: model.registrationStatus,
      terms: model.terms.map((term) => ({
        id: term.id,
        label: term.label,
        startDate: term.startDate,
        endDate: term.endDate,
        priceMinor: term.priceMinor,
      })),
    };
  }
}

export class PublicCatalogItemTermDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ format: 'date', example: '2027-07-01' })
  startDate!: string;

  @ApiProperty({ format: 'date', example: '2027-07-07' })
  endDate!: string;
}

export class PublicCatalogItemDto {
  @ApiProperty({ description: 'Link id of the detail `/e/:publicId`.' })
  publicId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description:
      'First photo, served at `public/catalog/events/:publicId/photos/:id`.',
  })
  coverPhotoId!: string | null;

  @ApiProperty({
    enum: REGISTRATION_STATUSES,
    description: '`not-open` before the first opening.',
  })
  registrationStatus!: PublicRegistrationStatus;

  @ApiProperty({
    type: [PublicCatalogItemTermDto],
    description: 'By start date.',
  })
  terms!: PublicCatalogItemTermDto[];

  static from(model: PublicCatalogItemModel): PublicCatalogItemDto {
    return {
      publicId: model.publicId,
      name: model.name,
      organizationName: model.organizationName,
      location: model.location,
      coverPhotoId: model.coverPhotoId,
      registrationStatus: model.registrationStatus,
      terms: model.terms.map((term) => ({
        id: term.id,
        label: term.label,
        startDate: term.startDate,
        endDate: term.endDate,
      })),
    };
  }
}
