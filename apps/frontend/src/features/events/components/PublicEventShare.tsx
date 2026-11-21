import { useState } from "react"
import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import { publicEventShareUrl } from "@/features/events/lib/publicLink"

type PublicEventShareProps = { publicId: string }

export function PublicEventShare({ publicId }: PublicEventShareProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [hasCopyFailed, setHasCopyFailed] = useState(false)
  const link = publicEventShareUrl(publicId)

  const handleCopy = async () => {
    setHasCopyFailed(false)
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
      toast.success("Odkaz zkopírován")
      window.setTimeout(() => setIsCopied(false), 3000)
    } catch {
      setIsCopied(false)
      setHasCopyFailed(true)
    }
  }

  const handleDownload = () => {
    const svg = document.querySelector<SVGSVGElement>("#public-event-qr svg")
    if (!svg) return
    const source = new XMLSerializer().serializeToString(svg)
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 512
      canvas.height = 512
      const context = canvas.getContext("2d")
      if (!context) return
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = "akce-qr.png"
        anchor.click()
        URL.revokeObjectURL(url)
      }, "image/png")
    }
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
  }

  return (
    <section
      aria-labelledby="share-event-heading"
      className="space-y-3"
    >
      <div>
        <h3
          id="share-event-heading"
          className="text-h4"
        >
          Sdílení akce
        </h3>
        <p className="text-sm text-muted-foreground">Sdílejte veřejný detail akce s účastníky.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Odkaz na veřejný detail akce"
          className="min-w-0 flex-1 basis-60"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          type="button"
          onClick={handleCopy}
        >
          {isCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {isCopied ? "Zkopírováno" : "Kopírovat odkaz"}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
            >
              <QrCode aria-hidden />
              QR kód
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QR kód akce</DialogTitle>
              <DialogDescription>Naskenujte kód a otevřete veřejný detail akce.</DialogDescription>
            </DialogHeader>
            <div
              id="public-event-qr"
              className="mx-auto w-full max-w-64 rounded-lg border border-border bg-white p-4"
            >
              <QRCodeSVG
                value={link}
                role="img"
                aria-label="QR kód veřejného detailu akce"
                className="size-full"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
            >
              <Download aria-hidden />
              Stáhnout PNG
            </Button>
          </DialogContent>
        </Dialog>
        <Button
          asChild
          variant="outline"
        >
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink aria-hidden />
            Otevřít
          </a>
        </Button>
      </div>
      {hasCopyFailed ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          Odkaz se nepodařilo zkopírovat. Označte ho a zkopírujte ručně.
        </p>
      ) : null}
    </section>
  )
}
