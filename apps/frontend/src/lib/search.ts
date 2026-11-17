/**
 * Text as a search compares it: trimmed, lower case and without diacritics,
 * so "tabor" finds "Tábor". Apply it to the query and the searched text alike.
 */
export function normalizeSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("cs-CZ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}
