import { z } from "zod"

import { TERM_PARTICIPATIONS } from "@/lib/participation"

/**
 * What the notification is about (S4-06): the organizer's decision on terms,
 * a decided change request, or a received payment.
 */
export const NOTIFICATION_KINDS = [
  "decision",
  "changeApproved",
  "changeRejected",
  "payment",
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export const notificationTermSchema = z.object({
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  /** The state after the event. */
  status: z.enum(TERM_PARTICIPATIONS),
})

export const participantNotificationSchema = z.object({
  /** The id of the saved decision, change request or payment. */
  id: z.string(),
  kind: z.enum(NOTIFICATION_KINDS),
  registrationId: z.string(),
  eventName: z.string(),
  /** When it was saved, ISO timestamp. */
  at: z.string(),
  isRead: z.boolean(),
  /** Empty for a payment and for a request that changed no term. */
  terms: z.array(notificationTermSchema),
  /** Only for a payment, in haléře. */
  amountMinor: z.number().int().nullable(),
})
export type ParticipantNotification = z.infer<typeof participantNotificationSchema>

/** Not dismissed, newest first. */
export const participantNotificationListSchema = z.object({
  items: z.array(participantNotificationSchema),
})
export type ParticipantNotificationList = z.infer<typeof participantNotificationListSchema>
