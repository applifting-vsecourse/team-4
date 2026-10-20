/** "1 lůžko", "2 lůžka", "5 lůžek", "0 lůžek" */
export function formatBeds(count: number) {
  if (count === 1) return "1 lůžko"
  if (count >= 2 && count <= 4) return `${count} lůžka`
  return `${count} lůžek`
}
