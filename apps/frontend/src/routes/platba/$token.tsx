import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { QrPayment } from "@/features/registrations/components/QrPayment"

// Payment opened from the QR (F21-1): public, no sign-in. The token in the
// path is the only credential and opens this one registration's payment.
export const Route = createFileRoute("/platba/$token")({
  component: QrPaymentPage,
})

function QrPaymentPage() {
  const { token } = Route.useParams()
  return (
    <>
      <Seo title="Platba přihlášky" />
      <ParticipantLayout>
        <div className="mx-auto w-full max-w-xl">
          <QrPayment token={token} />
        </div>
      </ParticipantLayout>
    </>
  )
}
