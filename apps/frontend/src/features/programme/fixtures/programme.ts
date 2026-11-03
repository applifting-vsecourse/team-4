import { programmeSchema, type Programme } from "@/features/programme/api/programmeSchemas"

// Preview data for a term's programme, parsed with the API schema so it can't
// drift from the contract.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

/** Two days of the first July term of the sample registration. */
export const TERM_PROGRAMME: Programme = programmeSchema.parse({
  items: [
    {
      id: uuid(901),
      title: "Příjezd a ubytování",
      startDate: "2027-07-04",
      startTime: "16:00",
      place: "Hlavní budova",
      description: "Předání klíčů od pokojů a seznámení s areálem.",
    },
    {
      id: uuid(902),
      title: "Společná večeře",
      startDate: "2027-07-04",
      startTime: "19:00",
      place: "Jídelna",
      description: null,
    },
    {
      id: uuid(903),
      title: "Výlet na rozhlednu",
      startDate: "2027-07-05",
      startTime: "09:30",
      place: null,
      description: null,
    },
  ],
})
