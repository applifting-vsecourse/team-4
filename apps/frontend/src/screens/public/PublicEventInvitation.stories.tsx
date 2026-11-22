import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { screenMeta } from "@/screens/screenMeta"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import type { CatalogEvent } from "@/features/public-events/api/publicEventSchemas"
import { publicEventHandlers } from "@/features/public-events/fixtures/handlers"
import {
  CATALOG_EVENT,
  PUBLIC_EVENT,
  PUBLIC_ID,
} from "@/features/public-events/fixtures/publicEvent"

const invitationEvent: CatalogEvent = {
  ...CATALOG_EVENT,
  photos: CATALOG_EVENT.photos.slice(0, 1),
  terms: CATALOG_EVENT.terms.slice(0, 1),
}

const meta = {
  title: "Screens/Public/Public Event Invitation",
  ...screenMeta,
  args: { url: `/e/${PUBLIC_ID}` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.catalogDetail(invitationEvent),
      ...publicEventHandlers.catalogList(),
      ...publicEventHandlers.detail({ ...PUBLIC_EVENT, terms: invitationEvent.terms }),
      ...participantHandlers.signedOut(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

export const Desktop: Story = {
  name: "Pozvánka · desktop",
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: CATALOG_EVENT.name })).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Vyplnit přihlášku" })).toHaveAttribute(
      "href",
      `/e/${PUBLIC_ID}/registration`,
    )
    await expect(canvas.getByRole("link", { name: /Zpět do katalogu/ })).toHaveAttribute(
      "href",
      ROUTES.catalog,
    )
  },
}

export const Mobile: Story = {
  name: "Pozvánka · mobil 360 px",
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    const registration = await canvas.findByRole("link", { name: "Vyplnit přihlášku" })
    const photo = canvas.getByRole("img", { name: /Fotka 1 akce/ })
    await expect(
      registration.compareDocumentPosition(photo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    const document = canvasElement.ownerDocument.documentElement
    await expect(document.scrollWidth).toBeLessThanOrEqual(document.clientWidth)
  },
}

export const MultipleTerms: Story = {
  name: "Více termínů",
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.catalogDetail({ ...invitationEvent, terms: CATALOG_EVENT.terms }),
      ...publicEventHandlers.detail(),
    )
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Termíny a ceny" })).toBeVisible()
    await expect(canvas.getByText("Turnus 2")).toBeVisible()
  },
}

export const WithoutPhoto: Story = {
  name: "Bez fotky · uzavřená registrace",
  beforeEach: ({ msw }) => {
    msw.use(
      ...publicEventHandlers.catalogDetail({
        ...invitationEvent,
        registrationStatus: "closed",
        photos: [],
        conditions: "",
        contact: null,
      }),
    )
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Registrace je uzavřená")).toBeVisible()
    await expect(
      canvas.queryByRole("img", { name: /Fotka akce|Fotka 1 akce/ }),
    ).not.toBeInTheDocument()
    await expect(canvas.queryByRole("link", { name: "Vyplnit přihlášku" })).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("heading", { name: "Kontakt na organizátora" }),
    ).not.toBeInTheDocument()
    await expect(canvas.queryByRole("heading", { name: "Podmínky účasti" })).not.toBeInTheDocument()
  },
}
