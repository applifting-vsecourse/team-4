import { toast } from "sonner"

import { useNotificationUpdate } from "@/features/participant-access/hooks/useNotificationUpdate"

export function useMarkAllNotificationsRead() {
  return useNotificationUpdate<void>({
    path: () => "/read",
    apply: (list) => ({ items: list.items.map((item) => ({ ...item, isRead: true })) }),
    // The kit's rich error colours miss the contrast threshold.
    onError: () =>
      toast.error("Oznámení se nepodařilo označit jako přečtená", { richColors: false }),
  })
}
