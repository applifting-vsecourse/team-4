import { toast } from "sonner"

import { useNotificationUpdate } from "@/features/participant-access/hooks/useNotificationUpdate"

/** Hides a notification for good; a failure brings it back and says so. */
export function useDismissNotification() {
  return useNotificationUpdate<string>({
    path: (id) => `/${id}/dismiss`,
    apply: (list, id) => ({ items: list.items.filter((item) => item.id !== id) }),
    // The kit's rich error colours miss the contrast threshold.
    onError: () => toast.error("Oznámení se nepodařilo skrýt", { richColors: false }),
  })
}
