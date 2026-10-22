import { parsePhoneNumberFromString } from "libphonenumber-js"

/**
 * An international number in E.164 ("+420 777 123 456" → "+420777123456"), or
 * null. Without the leading "+" there is no country to read it in. The server
 * applies the same rule.
 */
export function toE164(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith("+")) return null
  const phone = parsePhoneNumberFromString(trimmed)
  return phone?.isValid() ? phone.number : null
}
