import { type Gender } from "@/features/registrations/api/registrationSchemas"

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Žena",
  male: "Muž",
  other: "Jiná odpověď",
  undisclosed: "Nechci uvést",
}

export const GENDERS = Object.keys(GENDER_LABELS) as Gender[]

/** No answer reads "Neuvedeno", never "Nechci uvést" (F64). */
export const genderText = (gender: Gender | null) => (gender ? GENDER_LABELS[gender] : "Neuvedeno")
