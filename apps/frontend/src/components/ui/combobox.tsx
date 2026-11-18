import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type ComboboxOption = {
  value: string
  label: string
  /** A second, muted line, e.g. an e-mail. */
  description?: string
  /** Extra words the search matches, e.g. the description. */
  keywords?: string[]
}

type ComboboxProps = Omit<React.ComponentProps<typeof Button>, "value" | "onChange"> & {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  /** Shown on the trigger while nothing is selected. */
  placeholder: string
  searchPlaceholder: string
  /** Shown when the search matches no option. */
  emptyText: string
}

// A searchable select: the design system's Popover + Command pattern. The
// remaining props go to the trigger button, so a form label, `aria-invalid`
// and `aria-describedby` reach the focusable control.
function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  onBlur,
  className,
  ...props
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    // Modal, so the list scrolls inside a dialog, whose scroll lock would
    // otherwise swallow the wheel over the portalled list.
    <Popover
      modal
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          data-slot="combobox-trigger"
          className={cn("w-full justify-between font-normal", className)}
          onBlur={onBlur}
          {...props}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-slot="combobox-content"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords ?? [])]}
                  onSelect={() => {
                    onValueChange(option.value)
                    setIsOpen(false)
                  }}
                >
                  <Check className={cn(option.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox, type ComboboxOption }
