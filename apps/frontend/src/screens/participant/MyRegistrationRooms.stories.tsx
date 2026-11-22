import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { apiError, apiUrl, failOn } from "@/screens/msw"
import { screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import {
  NOT_PUBLISHED,
  ONE_OF_TWO_PUBLISHED,
  PARTICIPANT_PLACEMENTS,
  participantPlacementHandlers,
  PUBLISHED_ROOM,
  WITHOUT_ROOM,
  WITHOUT_WISHES,
} from "@/features/accommodation/fixtures/participantPlacements"
import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { programmeHandlers } from "@/features/programme/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATION } from "@/features/registrations/fixtures/participantRegistrations"

// Moje přihlášky → Detail přihlášky → Rozdělení pokojů (S4-02): the own room
// and the state of the own roommate wishes of each confirmed term, once the
// organizer published its rooms.

const DETAIL = "/participant/registrations/:registrationId"
const MOBILE = { viewport: { value: "mobile", isRotated: false } }
const TIMEOUT = { timeout: 5000 }

const meta = {
  title: "Screens/Participant/MyRegistrationRooms",
  ...screenMeta,
  args: { url: `/my-registrations/${OWN_REGISTRATION.id}` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...participantHandlers.signedIn(),
      ...registrationHandlers.own(),
      ...registrationHandlers.roommateWishes(),
      ...programmeHandlers.participant(),
      ...participantPlacementHandlers(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

type Canvas = StoryContext["canvas"]

/** The card, so labels elsewhere on the page don't match. */
const card = async (canvas: Canvas) => {
  const heading = await canvas.findByRole("heading", { name: "Rozdělení pokojů" }, TIMEOUT)
  const element = heading.closest<HTMLElement>('[data-slot="card"]')
  if (!element) throw new Error("No card Rozdělení pokojů")
  return within(element)
}

/** The published room and each own wish with its state. */
export const Published: Story = {
  play: async ({ canvas }) => {
    const rooms = await card(canvas)
    await expect(await rooms.findByText("Chatka 2")).toBeVisible()
    const wishes = within(rooms.getByRole("list", { name: "Přání na spolubydlící" }))
    const state = (name: string) => within(wishes.getByText(name).closest("li")!)
    await expect(state("Anna Procházková").getByText("Splněno")).toBeVisible()
    await expect(state("Petr Dvořák").getByText("Nesplněno")).toBeVisible()
    await expect(state("Eva Malá").getByText("Čeká na umístění")).toBeVisible()
  },
}

/** Not published yet: neither the room nor the wishes are shown. */
export const NotPublished: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantPlacementHandlers(NOT_PUBLISHED))
  },
  play: async ({ canvas }) => {
    const rooms = await card(canvas)
    await expect(await rooms.findByText("Rozdělení pokojů zatím není zveřejněné.")).toBeVisible()
    await expect(rooms.queryByText("Chatka 2")).not.toBeInTheDocument()
    await expect(
      rooms.queryByRole("list", { name: "Přání na spolubydlící" }),
    ).not.toBeInTheDocument()
  },
}

/** Published, but the participant has no room yet. */
export const WithoutRoom: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantPlacementHandlers(WITHOUT_ROOM))
  },
  play: async ({ canvas }) => {
    const rooms = await card(canvas)
    await expect(await rooms.findByText("Pokoj zatím není přidělen")).toBeVisible()
    await expect(rooms.getByText("Čeká na umístění")).toBeVisible()
  },
}

/** Published, without a wish that applies to the term. */
export const WithoutWishes: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantPlacementHandlers(WITHOUT_WISHES))
  },
  play: async ({ canvas }) => {
    const rooms = await card(canvas)
    await expect(await rooms.findByText("Chatka 2")).toBeVisible()
    await expect(
      rooms.getByText("Pro tento termín nemáte žádné přání na spolubydlící."),
    ).toBeVisible()
  },
}

/** Each term is published on its own. */
export const OneOfTwoPublished: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...participantPlacementHandlers(ONE_OF_TWO_PUBLISHED))
  },
  play: async ({ canvas }) => {
    const rooms = await card(canvas)
    const term = (label: string) =>
      within(rooms.getByRole("heading", { name: label }).closest("section")!)
    await expect(await rooms.findByRole("heading", { name: "Turnus 1" })).toBeVisible()
    await expect(term("Turnus 1").getByText("Chatka 2")).toBeVisible()
    await expect(
      term("Turnus 2").getByText("Rozdělení pokojů zatím není zveřejněné."),
    ).toBeVisible()
  },
}

/** A failed load is an error with a retry, never "not published" or "no room". */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    let calls = 0
    msw.use(
      http.get(apiUrl(PARTICIPANT_PLACEMENTS), () =>
        calls++ === 0 ? apiError(500) : HttpResponse.json(PUBLISHED_ROOM),
      ),
    )
  },
  play: async ({ canvas }) => {
    const rooms = await card(canvas)
    await expect(
      await rooms.findByText("Rozdělení pokojů se nepodařilo načíst", undefined, TIMEOUT),
    ).toBeVisible()
    await expect(
      rooms.queryByText("Rozdělení pokojů zatím není zveřejněné."),
    ).not.toBeInTheDocument()
    await expect(rooms.queryByText("Pokoj zatím není přidělen")).not.toBeInTheDocument()
    await userEvent.click(rooms.getByRole("button", { name: "Zkusit znovu" }))
    await expect(await rooms.findByText("Chatka 2")).toBeVisible()
  },
}

/** Another participant's registration: unavailable, nothing about rooms. */
export const ForeignRegistration: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", DETAIL, 404))
  },
  play: async ({ canvas }) => {
    await showsText("Záznam není dostupný")
    await expect(
      canvas.queryByRole("heading", { name: "Rozdělení pokojů" }),
    ).not.toBeInTheDocument()
    await expect(canvas.queryByText("Chatka 2")).not.toBeInTheDocument()
  },
}

/** At 360 px the rooms and wishes fit without horizontal scrolling. */
export const Mobile: Story = {
  globals: MOBILE,
  play: async ({ canvas }) => {
    const rooms = await card(canvas)
    await expect(rooms.getByText("Ubytování", { exact: true })).toBeVisible()
    await expect(await rooms.findByText("Barbora Kučerová")).toBeVisible()
    await expect(await rooms.findByText("Anna Procházková")).toBeVisible()
    await waitFor(() =>
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth),
    )
  },
}
