import { useState } from "react"
import {
  Check,
  ChevronsUpDown,
  CreditCard,
  LayoutDashboard,
  MoreHorizontal,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { ShowcaseItem, ShowcaseSection } from "./ShowcaseSection"

const EVENTS = [
  { value: "summer", label: "Letní tábor 2027" },
  { value: "winter", label: "Zimní lyžařský kurz 2027" },
  { value: "weekend", label: "Víkendovka Javor" },
]

const SIDEBAR_ITEMS = [
  { label: "Přehled", icon: LayoutDashboard, isActive: true },
  { label: "Přihlášky", icon: Users, isActive: false },
  { label: "Platby", icon: CreditCard, isActive: false },
]

function EventCombobox() {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState("")
  const selected = EVENTS.find((event) => event.value === value)

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="w-full justify-between font-normal"
        >
          {selected?.label ?? "Vyberte akci"}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput placeholder="Hledat akci…" />
          <CommandList>
            <CommandEmpty>Nic nenalezeno.</CommandEmpty>
            <CommandGroup>
              {EVENTS.map((event) => (
                <CommandItem
                  key={event.value}
                  value={event.label}
                  onSelect={() => {
                    setValue(event.value)
                    setIsOpen(false)
                  }}
                >
                  <Check className={cn(event.value === value ? "opacity-100" : "opacity-0")} />
                  {event.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function OverlaysNavigationSection() {
  return (
    <>
      <ShowcaseSection
        id="overlays"
        title="Překryvné prvky"
        description="Ověřte ovládání klávesnicí: Enter otevře, Esc zavře, zaměření se vrátí na spouštěč."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <ShowcaseItem label="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">Zrušit přihlášku</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Zrušit přihlášku?</DialogTitle>
                  <DialogDescription>
                    Uvolněné lůžko automaticky obsadí první náhradník. Akci nelze vrátit.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Ponechat</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive">Zrušit přihlášku</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </ShowcaseItem>
          <ShowcaseItem label="Popover + Command (combobox)">
            <EventCombobox />
          </ShowcaseItem>
          <ShowcaseItem label="DropdownMenu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Akce s přihláškou"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Zobrazit detail</DropdownMenuItem>
                <DropdownMenuItem>Zaznamenat platbu</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Zrušit</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ShowcaseItem>
          <ShowcaseItem label="Tooltip · Toast">
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Najeďte myší</Button>
                </TooltipTrigger>
                <TooltipContent>Variabilní symbol je jedinečný v rámci organizace</TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                onClick={() => toast.success("Platba zaznamenána")}
              >
                Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.error("Platbu se nepodařilo uložit")}
              >
                Chybový toast
              </Button>
            </div>
          </ShowcaseItem>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="navigation"
        title="Navigace"
      >
        <ShowcaseItem label="Breadcrumb">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#navigation">Akce</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#navigation">Letní tábor 2027</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Přihlášky</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </ShowcaseItem>
        <ShowcaseItem label="Tabs">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Vše</TabsTrigger>
              <TabsTrigger value="confirmed">Potvrzené</TabsTrigger>
              <TabsTrigger value="waitlist">Náhradníci</TabsTrigger>
            </TabsList>
            <TabsContent
              value="all"
              className="text-sm text-muted-foreground"
            >
              43 přihlášek
            </TabsContent>
            <TabsContent
              value="confirmed"
              className="text-sm text-muted-foreground"
            >
              40 potvrzených
            </TabsContent>
            <TabsContent
              value="waitlist"
              className="text-sm text-muted-foreground"
            >
              3 náhradníci
            </TabsContent>
          </Tabs>
        </ShowcaseItem>
        <ShowcaseItem label="Sidebar (collapsible=none, zde ve zmenšeném rámu)">
          <SidebarProvider className="min-h-0 overflow-hidden rounded-lg border border-border">
            <Sidebar
              collapsible="none"
              className="h-64"
            >
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Organizace</SidebarGroupLabel>
                  <SidebarMenu>
                    {SIDEBAR_ITEMS.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton isActive={item.isActive}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            <div className="flex-1 bg-background p-4 text-sm text-muted-foreground">
              Obsah stránky
            </div>
          </SidebarProvider>
        </ShowcaseItem>
      </ShowcaseSection>
    </>
  )
}
