export function hourOfDay(date: Date): number {
  return date.getHours() + date.getMinutes() / 60
}
