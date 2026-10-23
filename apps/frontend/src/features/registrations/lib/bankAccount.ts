import { type PaymentInstructions } from "@/features/registrations/api/registrationSchemas"

/** "2501234567/2010", or "19-2000145399/0800" with a prefix. */
export function formatBankAccount({ prefix, number, bankCode }: PaymentInstructions["account"]) {
  return `${prefix ? `${prefix}-` : ""}${number}/${bankCode}`
}
