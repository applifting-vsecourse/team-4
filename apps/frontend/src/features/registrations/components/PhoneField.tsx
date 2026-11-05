import { useState, type ComponentProps } from "react"
import { type CountryCode } from "libphonenumber-js"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  countryOf,
  DEFAULT_COUNTRY,
  digitsWithoutPrefix,
  flagOf,
  nationalPart,
  PHONE_COUNTRIES,
  withPrefix,
} from "@/features/registrations/lib/phoneCountries"

type PhoneFieldProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  /** The full number with its "+prefix", or "" while empty. */
  value: string
  onChange: (value: string) => void
}

// Country selector plus the national number. The form value is always the full
// international number, so the schema, draft and request stay unchanged.
// A pasted "+421 …" switches the country by itself.
export function PhoneField({ value, onChange, ...rest }: PhoneFieldProps) {
  const [country, setCountry] = useState<CountryCode>(() =>
    value.trim().startsWith("+") ? countryOf(value) : DEFAULT_COUNTRY,
  )
  // What the visitor typed stays as typed; only the stored value is composed.
  const [text, setText] = useState(() => nationalPart(value, country))

  const changeCountry = (next: string) => {
    const code = next as CountryCode
    // A number typed with its own prefix keeps its digits under the new country.
    const national = text.trim().startsWith("+") ? digitsWithoutPrefix(text) : text
    setCountry(code)
    setText(national)
    onChange(withPrefix(national, code))
  }

  const changeNumber = (typed: string) => {
    const next = typed.trim().startsWith("+") ? countryOf(typed) : country
    setCountry(next)
    setText(typed)
    onChange(withPrefix(typed, next))
  }

  return (
    <div className="flex gap-2">
      <Select
        value={country}
        onValueChange={changeCountry}
      >
        <SelectTrigger
          aria-label="Země a předvolba"
          className="w-36 shrink-0"
        >
          <SelectValue>
            {flagOf(country)} +{PHONE_COUNTRIES.find((c) => c.code === country)?.callingCode}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PHONE_COUNTRIES.map((c) => (
            <SelectItem
              key={c.code}
              value={c.code}
            >
              {flagOf(c.code)} {c.name} (+{c.callingCode})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        {...rest}
        aria-required
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        placeholder="777 123 456"
        value={text}
        onChange={(event) => changeNumber(event.target.value)}
      />
    </div>
  )
}
