import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"

export const DEFAULT_COUNTRY: CountryCode = "CZ"

const names = new Intl.DisplayNames(["cs"], { type: "region" })

/** The flag emoji of a country: its two letters as regional indicator symbols. */
export function flagOf(code: CountryCode) {
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1a5 + letter.charCodeAt(0)))
}

export type PhoneCountry = { code: CountryCode; name: string; callingCode: string }

// Czechia and Slovakia first, the rest alphabetically in Czech.
const PINNED: CountryCode[] = ["CZ", "SK"]

export const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
  .map((code) => ({
    code,
    name: names.of(code) ?? code,
    callingCode: getCountryCallingCode(code),
  }))
  .sort((a, b) => {
    const pa = PINNED.indexOf(a.code)
    const pb = PINNED.indexOf(b.code)
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    return a.name.localeCompare(b.name, "cs")
  })

/** The country a typed or stored "+…" number belongs to, or the default. */
export function countryOf(value: string): CountryCode {
  return parsePhoneNumberFromString(value.trim())?.country ?? DEFAULT_COUNTRY
}

/** The number without the "+prefix " of the country, as shown in the input. */
export function nationalPart(value: string, country: CountryCode) {
  const prefix = `+${getCountryCallingCode(country)}`
  return value.startsWith(prefix) ? value.slice(prefix.length).trimStart() : value
}

/** The full value stored in the form; empty while no national part is typed. */
export function withPrefix(national: string, country: CountryCode) {
  const trimmed = national.trim()
  if (trimmed === "") return ""
  if (trimmed.startsWith("+")) return trimmed
  return `+${getCountryCallingCode(country)} ${trimmed}`
}

/** The national digits of a "+prefix number" as typed, or the digits after the "+" when unreadable. */
export function digitsWithoutPrefix(text: string) {
  const parsed = parsePhoneNumberFromString(text.trim())
  return parsed ? parsed.nationalNumber : text.trim().replace(/^\+\d{0,3}\s*/, "")
}
