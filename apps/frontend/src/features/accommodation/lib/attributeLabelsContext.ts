import { createContext, useContext } from "react"

import { GENDER_LABELS, type AttributeLabels } from "@/features/accommodation/lib/evaluationView"

/**
 * The labels of the event's categorical questions (#485) for components deep
 * in a view; gender's own labels when no section provides the event's.
 */
export const AttributeLabelsContext = createContext<AttributeLabels>(GENDER_LABELS)

export const useShownLabels = () => useContext(AttributeLabelsContext)
