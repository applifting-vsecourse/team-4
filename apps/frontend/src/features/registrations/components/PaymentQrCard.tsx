import { Copy, ExternalLink, QrCode } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type PaymentQrCardProps = {
  /** Already formatted remaining debt, e.g. "2 400 Kč". */
  debt: string
  /** The web link the QR code encodes, shown as text. */
  link: string
}

// Moje přihlášky → Detail přihlášky → Platba → QR / odkaz (F21-1). Design only:
// every value is passed in. The QR encodes a web link, not a bank instruction.
export function PaymentQrCard({ debt, link }: PaymentQrCardProps) {
  return (
    <section
      aria-labelledby="payment-qr-title"
      className="mt-4 space-y-4 border-t border-border pt-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="payment-qr-title"
          className="text-h4"
        >
          Simulace úhrady přes QR
        </h2>
        <Badge variant="secondary">Simulace</Badge>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex size-40 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
          <QrCode
            role="img"
            aria-label="QR kód s odkazem na simulaci úhrady"
            className="size-28"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <p>
            Naskenujte kód a na otevřené stránce zadejte, kolik chcete uhradit z{" "}
            <span className="font-mono">{debt}</span>. Platba je pouze simulovaná, žádné peníze se
            nepřevádějí.
          </p>
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
              Otevřít simulaci
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
