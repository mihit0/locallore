import { formatInTimeZone } from 'date-fns-tz'

// Eastern Time Zone identifier
export const TIMEZONE = 'America/New_York'

// Convert a datetime-local input value to an ISO string, treating the input as Eastern Time
export function localToEastern(dateTimeLocal: string): string {
  if (!dateTimeLocal) return ''
  
  // Create a date object treating the input as Eastern Time
  const date = new Date(dateTimeLocal)
  const easternDate = formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX")
  return new Date(easternDate).toISOString()
}

// Format a date for display in Eastern Time
export function formatEasternDateTime(isoString: string): string {
  if (!isoString) return ''
  return formatInTimeZone(new Date(isoString), TIMEZONE, 'MMM d, h:mm a z')
}

// Convert an ISO string to a datetime-local input value in Eastern Time
export function easternToLocal(isoString: string): string {
  if (!isoString) return ''
  return formatInTimeZone(new Date(isoString), TIMEZONE, "yyyy-MM-dd'T'HH:mm")
}

// Get current date-time in Eastern Time as ISO string
export function getCurrentEasternTime(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX")
}

// Get max date (7 days from now) in Eastern Time as ISO string
export function getMaxEasternTime(): string {
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 7)
  return formatInTimeZone(maxDate, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX")
} 