import { useNotificationUpdate } from "@/features/participant-access/hooks/useNotificationUpdate"

/** Opening a notification marks it read; a failure is not worth a message. */
export function useMarkNotificationRead() {
  return useNotificationUpdate<string>({
    path: (id) => `/${id}/read`,
    apply: (list, id) => ({
      items: list.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    }),
  })
}
