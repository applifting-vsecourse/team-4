import { useState } from "react"
import { Check, Copy, ExternalLink } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { Button } from "@/components/ui/button"

export type PaymentQrCardProps = {
  /** The web link the QR code encodes, shown as text. */
  link: string
}

// Moje přihlášky → Detail přihlášky → Platba → QR / odkaz (F21-1). The QR
// encodes a web link, not a bank instruction.
export function PaymentQrCard({ link }: PaymentQrCardProps) {
  const [isCopied, setIsCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
    } catch {
      // The link is shown as text, so it can still be copied by hand.
    }
  }

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
        <div className="flex size-40 shrink-0 items-center justify-center rounded-lg border border-border bg-card p-2">
          <QRCodeSVG
            value={link}
            role="img"
            aria-label="QR kód s odkazem na platbu"
            className="size-full"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <p>Naskenujte kód telefonem a na otevřené stránce zvolte, kolik chcete zaplatit.</p>
          <p className="font-mono text-xs break-all text-muted-foreground">{link}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copy()}
            >
              {isCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {isCopied ? "Odkaz zkopírován" : "Zkopírovat odkaz"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={link}>
                <ExternalLink aria-hidden />
                Otevřít platbu
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
