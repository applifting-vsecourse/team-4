import { z } from "zod"

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

export const organizationsSchema = z.array(organizationSchema)

export type Organization = z.infer<typeof organizationSchema>
