import { z } from "zod"

/** One item of a term's programme; the start is Europe/Prague wall-clock time. */
export const programmeItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  /** `yyyy-MM-dd` */
  startDate: z.string(),
  /** `HH:mm` */
  startTime: z.string(),
  place: z.string().nullable(),
  description: z.string().nullable(),
})

/** Chronological: by day, start time, then creation. */
export const programmeSchema = z.object({
  items: z.array(programmeItemSchema),
})

export type ProgrammeItemData = z.infer<typeof programmeItemSchema>
export type Programme = z.infer<typeof programmeSchema>

export type ProgrammeItemInput = Omit<ProgrammeItemData, "id">
