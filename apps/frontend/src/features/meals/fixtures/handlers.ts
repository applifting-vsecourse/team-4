import { http, HttpResponse } from "msw"

import { env } from "@/config/env"

import type { MealOverview } from "@/features/meals/api/mealSchemas"
import { MEAL_OVERVIEW, MEAL_OVERVIEW_EMPTY } from "@/features/meals/fixtures/meals"

// MSW handlers for Správa akce → Stravování. Install with `msw.use(...)` in a
// story's `beforeEach`.

const OVERVIEW = `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/meals/:termId`

export const mealHandlers = {
  overview: (overviews: MealOverview[] = [MEAL_OVERVIEW, MEAL_OVERVIEW_EMPTY]) => [
    http.get(OVERVIEW, ({ params }) => {
      const overview = overviews.find((item) => item.termId === params.termId)
      return overview
        ? HttpResponse.json(overview)
        : HttpResponse.json({ statusCode: 404 }, { status: 404 })
    }),
  ],
}
