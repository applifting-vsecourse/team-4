import {
  organizationsSchema,
  type Organization,
} from "@/features/organizations/api/organizationSchemas"

// Preview data, parsed with the API schema so it can't drift from the contract.

export const ORGANIZATIONS: Organization[] = organizationsSchema.parse([
  { id: "0190c0de-0000-7000-8000-000000000201", name: "Tábor Modrá Hora z. s." },
  { id: "0190c0de-0000-7000-8000-000000000202", name: "Skautské středisko Javor" },
])

export const [ORGANIZATION] = ORGANIZATIONS as [Organization, ...Organization[]]
