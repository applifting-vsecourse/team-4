import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = () =>
  queryOptions({
    queryKey: quackKeys.lists(),
    queryFn: async () => quacksSchema.parse(await api.get("quacks").json()),
  })
