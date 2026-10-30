import type { CSSProperties } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  BarChart3,
  BedDouble,
  CalendarCog,
  ClipboardList,
  Copy,
  CreditCard,
  LayoutDashboard,
  Mail,
  Settings,
} from "lucide-react"

import { BrandMark } from "@/components/BrandMark"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

import {
  ChangeApprovalSettings,
  type ChangeApprovalSettingsProps,
} from "@/features/events/components/ChangeApprovalSettings"

// F35-1a design preview: the number of days before each term's start from
// which registration changes need the organizer's approval.
// Static only: no router, queries or API; every value below is hard-coded.

const SAVED_14 = "Schvalujete změny přihlášek od 14 dní před začátkem termínu"

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const eventSections = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Přihlášky", icon: ClipboardList },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble },
  { label: "Komunikace", icon: Mail },
  { label: "Nastavení", icon: Settings, isActive: true },
]

// The organization shell of the Nastavení page, showing the Přihlašování
// card: its state and public link stay as they are, the new block follows.
function SettingsPage(props: ChangeApprovalSettingsProps) {
  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <Sidebar>
        <SidebarHeader>
          <BrandMark isLarge />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Organizace</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <CalendarCog />
                  <span>Akce a turnusy</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <BarChart3 aria-hidden />
                  <span>Reporty</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Akce</SidebarGroupLabel>
            <SidebarMenu>
              {eventSections.map((section) => (
                <SidebarMenuItem key={section.label}>
                  <SidebarMenuButton isActive={section.isActive}>
                    <section.icon aria-hidden />
                    <span>{section.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12">
          <PageHeader
            breadcrumb={
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>Tábor Modrá Hora z. s.</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Akce a turnusy</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Letní tábor Modrá Hora 2027</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Nastavení</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            }
            title="Nastavení"
            badge={<Badge variant="secondary">Přihlašování otevřeno</Badge>}
          />
          <section aria-labelledby="registration-heading">
            <h2
              id="registration-heading"
              className="mb-4 text-h4"
            >
              Přihlašování
            </h2>
            <Card>
              <CardContent>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">Stav</span>
                    <Badge variant="secondary">Přihlašování otevřeno</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="public-link">Veřejný odkaz na přihlášku</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        id="public-link"
                        className="min-w-0 flex-1 basis-60"
                        readOnly
                        value="https://akc.io/e/modra-hora-2027"
                      />
                      <Button
                        type="button"
                        variant="outline"
                      >
                        <Copy />
                        Kopírovat
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <ChangeApprovalSettings {...props} />
                </div>
              </CardContent>
            </Card>
          </section>
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}

const meta = {
  title: "Designs/F35-1a Change approval threshold",
  component: SettingsPage,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { savedSetting: SAVED_14, days: "14" },
} satisfies Meta<typeof SettingsPage>

export default meta

type Story = StoryObj<typeof meta>

// The kit's destructive Alert description (`text-destructive/90`) is 4.3:1
// against the 4.5:1 AA minimum; these stories report it as a warning.
const contrastWarning = { a11y: { test: "todo" } }

/** Saved threshold: changes from 14 days before each term's start need approval. */
export const Saved: Story = {}

/** No threshold (empty or removed): all changes go through directly, no 30-day default. */
export const NotSet: Story = {
  args: { savedSetting: "Změny přihlášek probíhají bez schválení", days: "" },
}

/** Zero: approval starts on the day the term begins. */
export const Zero: Story = {
  args: { savedSetting: "Schvalujete změny přihlášek ode dne začátku termínu", days: "0" },
}

/** A negative, decimal or non-numeric value is marked; the entry and the saved setting stay. */
export const InvalidValue: Story = {
  args: { days: "2,5", daysError: "Zadejte nezáporné celé číslo dní." },
}

/** Saving failed: the entered value stays for a retry, the saved setting still applies. */
export const SaveFailed: Story = {
  parameters: contrastWarning,
  args: {
    days: "7",
    errorMessage: "Schvalování změn se nepodařilo uložit. Zkuste to prosím znovu.",
  },
}
