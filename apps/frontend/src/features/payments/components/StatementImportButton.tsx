import { useRef } from "react"
import { Upload } from "lucide-react"

import { PendingButton } from "@/components/PendingButton"
import { Input } from "@/components/ui/input"

type StatementImportButtonProps = {
  isPending: boolean
  onSelect: (file: File) => void
}

// „Import výpisu“: picks a CSV statement and hands it over at once, as the
// photo upload of the presentation does.
export function StatementImportButton({ isPending, onSelect }: StatementImportButtonProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <>
      <Input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-label="Soubor s výpisem"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) onSelect(file)
        }}
      />
      <PendingButton
        type="button"
        isPending={isPending}
        icon={<Upload aria-hidden />}
        onClick={() => fileInput.current?.click()}
      >
        {isPending ? "Importuji…" : "Import výpisu"}
      </PendingButton>
    </>
  )
}
