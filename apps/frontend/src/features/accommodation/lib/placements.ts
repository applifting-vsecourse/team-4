import type { PlacementPerson, TermPlacements } from "@/features/accommodation/api/placementSchemas"
import { attributeLabel, valueLabel } from "@/features/accommodation/lib/evaluationView"

export type BoardPerson = {
  id: string
  name: string
  /** The value of the hard attribute as worded on the form; null when rooms are not split. */
  value: string | null
  roomId: string | null
  isLocked: boolean
}

export type BoardRoom = {
  id: string
  label: string
  baseBeds: number
  extraBeds: number
  people: BoardPerson[]
  /** Beds and extra beds still free; never below zero. */
  free: number
}

export type PlacementBoard = {
  rooms: BoardRoom[]
  unplaced: BoardPerson[]
  people: BoardPerson[]
}

const byName = (a: PlacementPerson, b: PlacementPerson) =>
  a.lastName.localeCompare(b.lastName, "cs") || a.firstName.localeCompare(b.firstName, "cs")

/** The term's placements as rooms with their people and the people without a room. */
export function toPlacementBoard(data: TermPlacements): PlacementBoard {
  const people = [...data.people].sort(byName).map((person): BoardPerson => ({
    id: person.registrationId,
    name: `${person.firstName} ${person.lastName}`,
    value: data.hardAttribute ? valueLabel(data.hardAttribute, person.value) : null,
    roomId: person.roomId,
    isLocked: person.isLocked,
  }))
  const roomIds = new Set(data.rooms.map((room) => room.id))
  return {
    people,
    rooms: data.rooms.map((room) => {
      const inRoom = people.filter((person) => person.roomId === room.id)
      return {
        ...room,
        people: inRoom,
        free: Math.max(0, room.baseBeds + room.extraBeds - inRoom.length),
      }
    }),
    unplaced: people.filter((person) => person.roomId === null || !roomIds.has(person.roomId)),
  }
}

export type PlacementWarning =
  /** People with different values of the hard attribute would share the room. */
  | { kind: "mixed"; attribute: string; values: string[] }
  /** The room would use an extra bed. */
  | { kind: "extraBed" }
  /** The room would hold more people than beds and extra beds. */
  | { kind: "overCapacity" }

/** What breaks the room rules when the participant moves to the room; empty when nothing does. */
export function placementWarnings(
  data: TermPlacements,
  registrationId: string,
  roomId: string,
): PlacementWarning[] {
  const room = data.rooms.find((candidate) => candidate.id === roomId)
  const person = data.people.find((candidate) => candidate.registrationId === registrationId)
  if (!room || !person || person.roomId === roomId) return []

  const after = [...data.people.filter((other) => other.roomId === roomId), person]
  const warnings: PlacementWarning[] = []

  const attribute = data.hardAttribute
  if (attribute) {
    const values = [...new Set(after.map((other) => other.value))]
    if (values.length > 1) {
      warnings.push({
        kind: "mixed",
        attribute: attributeLabel(attribute),
        values: values.map((value) => valueLabel(attribute, value)),
      })
    }
  }

  if (after.length > room.baseBeds + room.extraBeds) {
    warnings.push({ kind: "overCapacity" })
  } else if (after.length > room.baseBeds) {
    warnings.push({ kind: "extraBed" })
  }
  return warnings
}

/** The warning as shown before the organizer confirms the placement. */
export function warningText(warning: PlacementWarning): string {
  switch (warning.kind) {
    case "mixed":
      return `Pokoj bude smíšený podle pravidla ${warning.attribute}: ${warning.values.join(", ")}.`
    case "extraBed":
      return "Účastník obsadí přistýlku."
    case "overCapacity":
      return "Pokoj překročí kapacitu lůžek a přistýlek."
  }
}

/** A mixed room against the hard attribute: the organizer is offered to lock the exception. */
export const offersLock = (warnings: PlacementWarning[]) =>
  warnings.some((warning) => warning.kind === "mixed")
