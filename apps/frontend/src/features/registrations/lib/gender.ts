import { type Gender, type GenderAnswer } from "@/features/registrations/api/registrationSchemas"

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Žena",
  male: "Muž",
  other: "Jiná odpověď",
  undisclosed: "Nechci uvést",
}

export const GENDERS = Object.keys(GENDER_LABELS) as Gender[]

/** The server's limit of the own words for "Jiná odpověď". */
export const GENDER_OTHER_MAX_LENGTH = 100

export const NO_GENDER_ANSWER: GenderAnswer = { gender: null, genderOther: null }

/** No answer reads "Neuvedeno", never "Nechci uvést" (F64). */
export const genderText = (gender: Gender | null) => (gender ? GENDER_LABELS[gender] : "Neuvedeno")

/** The answer as it is sent: own words trimmed, kept only beside "Jiná odpověď". */
export function toGenderAnswer({ gender, genderOther }: GenderAnswer): GenderAnswer {
  const words = genderOther?.trim() ?? ""
  return { gender, genderOther: gender === "other" && words !== "" ? words : null }
}
