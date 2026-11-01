import { Copy, ExternalLink, QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"

export type PaymentQrCardProps = {
  /** The web link the QR code encodes, shown as text. */
  link: string
}

// Moje přihlášky → Detail přihlášky → Platba → QR / odkaz (F21-1). Design only:
// every value is passed in. The QR encodes a web link, not a bank instruction;
// the payment behind it is simulated, which the participant is not told.
export function PaymentQrCard({ link }: PaymentQrCardProps) {
  return (
    <section
      aria-labelledby="payment-qr-title"
      className="mt-4 space-y-4 border-t border-border pt-4"
    >
      <h2
        id="payment-qr-title"
        className="text-h4"
      >
        Zaplatit QR kódem
      </h2>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex size-40 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
          <QrCode
            role="img"
            aria-label="QR kód s odkazem na platbu"
            className="size-28"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <p>Naskenujte kód telefonem a na otevřené stránce zvolte, kolik chcete zaplatit.</p>
          <p className="font-mono text-xs break-all text-muted-foreground">{link}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
            >
              <Copy aria-hidden />
              Zkopírovat odkaz
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <ExternalLink aria-hidden />
              Otevřít platbu
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
