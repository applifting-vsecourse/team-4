import { toast } from "sonner"

import { useNotificationUpdate } from "@/features/participant-access/hooks/useNotificationUpdate"

/**
 * Marks the notifications the participant was shown as read; one saved after
 * the list loaded stays unread.
 */
export function useMarkAllNotificationsRead() {
  return useNotificationUpdate<string[]>({
    path: () => "/read",
    body: (ids) => ({ ids }),
    apply: (list, ids) => ({
      items: list.items.map((item) => (ids.includes(item.id) ? { ...item, isRead: true } : item)),
    }),
    // The kit's rich error colours miss the contrast threshold.
    onError: () =>
      toast.error("Oznámení se nepodařilo označit jako přečtená", { richColors: false }),
  })
}
