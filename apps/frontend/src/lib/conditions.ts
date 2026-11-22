/** Split participation conditions into the non-empty, trimmed lines shown publicly. */
export function splitConditions(conditions: string): string[] {
  return conditions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
