import { ROUTES } from "@/app/routes"

/** The web link a payment QR code encodes (F21-1); it carries no bank instruction. */
export const paymentLinkUrl = (token: string) =>
  `${window.location.origin}${ROUTES.qrPayment.replace("$token", token)}`
