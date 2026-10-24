import { useState, useSyncExternalStore } from "react"
import { useRouterState } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Mail,
  Minimize2,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react"

import { type AppRouter } from "@/app/createAppRouter"
import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { formatPragueDateTime } from "@/lib/date"
import { mockBackend } from "@/prototype/mockBackend/MockBackend"
import { DEMO, PASSWORD } from "@/prototype/mockBackend/scenarios"

type PrototypeDockProps = { router: AppRouter }

// Floating controls of a clickable prototype, outside the app's own UI: the
// address bar of the in-memory browser, shortcuts to places that only a link
// from outside reaches (the public event link, the participant's area) and the
// mailbox the mock backend "sends" magic links to.
export function PrototypeDock({ router }: PrototypeDockProps) {
  const href = useRouterState({ router, select: (state) => state.location.href })
  useSyncExternalStore(mockBackend.subscribe, mockBackend.getVersion)
  const [isOpen, setIsOpen] = useState(true)

  const go = (path: string) => router.history.push(path)
  const emails = mockBackend.emails
  const organizer = mockBackend.signedInOrganizer
  const participant = mockBackend.signedInParticipant

  if (!isOpen) {
    return (
      <aside
        aria-label="Prototype controls"
        className="fixed right-4 bottom-4 z-50"
      >
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
        >
          <SlidersHorizontal />
          Prototype
          {emails.length > 0 ? <Badge>{emails.length}</Badge> : null}
        </Button>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Prototype controls"
      className="fixed right-4 bottom-4 z-50 w-80"
    >
      <Card>
        <CardHeader>
          <CardTitle>Prototype</CardTitle>
          <CardDescription>
            Organizer: {organizer ? organizer.name : "signed out"}
            <br />
            Participant: {participant ?? "signed out"}
          </CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Minimize prototype controls"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <form
              key={href}
              className="flex items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault()
                const address = new FormData(event.currentTarget).get("address")
                if (typeof address === "string" && address.startsWith("/")) go(address)
              }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Back"
                onClick={() => router.history.back()}
              >
                <ArrowLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Reload page"
                onClick={() => void router.invalidate()}
              >
                <RotateCw />
              </Button>
              <Input
                name="address"
                aria-label="Address"
                defaultValue={href}
                spellCheck={false}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Go to address"
              >
                <ArrowRight />
              </Button>
            </form>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Jump to
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72"
              >
                <DropdownMenuItem onSelect={() => go(ROUTES.home)}>Landing page</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go(ROUTES.login)}>
                  Organizer sign-in
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go(ROUTES.organizations)}>
                  Organizer: my organizations
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go(ROUTES.myRegistrations)}>
                  Participant: Moje přihlášky
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Public registration links</DropdownMenuLabel>
                {mockBackend.openEvents.map((event) => (
                  <DropdownMenuItem
                    key={event.publicId}
                    onSelect={() => go(ROUTES.publicEvent.replace("$publicId", event.publicId))}
                  >
                    {event.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => go(ROUTES.designSystem)}>
                  Design system
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <section
              aria-label="Mailbox"
              className="flex flex-col gap-2"
            >
              <p className="flex items-center gap-2 text-sm font-medium">
                <Mail
                  aria-hidden
                  className="size-4"
                />
                Mailbox
                <Badge variant="secondary">{emails.length}</Badge>
              </p>
              {emails.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Magic links the app sends appear here.
                </p>
              ) : (
                <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                  {emails.map((email) => (
                    <li
                      key={email.id}
                      className="rounded-md border border-border p-2 text-sm"
                    >
                      <p className="font-medium">{email.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        To {email.to}, {formatPragueDateTime(email.sentAt)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => go(email.action.path)}
                      >
                        {email.action.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {participant ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => mockBackend.endParticipantSession()}
              >
                Expire participant session
              </Button>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Organizers {DEMO.jana.email}, {DEMO.petr.email}, {DEMO.eva.email}; password {PASSWORD}
              . Participant {DEMO.anna.email}.
            </p>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
