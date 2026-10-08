import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { Providers } from "@/app/Providers"

const rootElement = document.getElementById("root")!

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <Providers />
    </StrictMode>,
  )
}
