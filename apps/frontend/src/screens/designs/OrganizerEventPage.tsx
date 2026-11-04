import { Fragment, type CSSProperties, type ReactNode } from "react"
import {
  BarChart3,
  BedDouble,
  CalendarCog,
  ClipboardList,
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

// The static organization shell around the accommodation evaluation designs
// (F13-1, F14-1, F16-1, F17-1, F39-1): sidebar with the event sections and the
// page header. No router, queries or API.

export const EVENT_NAME = "Letní tábor Lipnice 2027"

const SIDEBAR_STYLE = { "--sidebar-width": "14rem" } as CSSProperties

const SECTIONS = [
  { label: "Přehled", icon: LayoutDashboard },
  { label: "Nastavení", icon: Settings },
  { label: "Přihlášky", icon: ClipboardList },
  { label: "Platby", icon: CreditCard },
  { label: "Ubytování", icon: BedDouble },
  { label: "Komunikace", icon: Mail },
] as const

export type EventSection = (typeof SECTIONS)[number]["label"]

export type OrganizerEventPageProps = {
  section: EventSection
  /** Breadcrumb after the event, the last one is the current page. */
  crumbs: string[]
  /** Defaults to the event name. */
  title?: string
  /** Hide the event's status badge, e.g. on a registration detail. */
  isBadgeHidden?: boolean
  children: ReactNode
}

export function OrganizerEventPage({
  section,
  crumbs,
  title = EVENT_NAME,
  isBadgeHidden = false,
  children,
}: OrganizerEventPageProps) {
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
                  <CalendarCog aria-hidden />
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
              {SECTIONS.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={item.label === section}>
                    <item.icon aria-hidden />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <section className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:py-12">
          <PageHeader
            breadcrumb={
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>Junák – středisko Lipnice</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Akce a turnusy</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>{EVENT_NAME}</BreadcrumbItem>
                  {crumbs.map((crumb, index) => (
                    <Fragment key={crumb}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {index === crumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb}</BreadcrumbPage>
                        ) : (
                          crumb
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            }
            title={title}
            badge={isBadgeHidden ? null : <Badge variant="success">Registrace otevřena</Badge>}
          />
          {children}
        </section>
      </SidebarInset>
    </SidebarProvider>
  )
}
