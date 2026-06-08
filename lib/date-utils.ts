const TZ = 'America/Chicago'

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function formatDate(d: Date, lang: string): string {
  if (lang === 'es') {
    const weekday = cap(new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: TZ }).format(d))
    const day     = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: TZ }).format(d)
    const month   = cap(new Intl.DateTimeFormat('es', { month: 'short', timeZone: TZ }).format(d))
    const time    = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(d)
    return `${weekday} ${day} ${month} • ${time} CT`
  }
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ }).format(d)
  const month   = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: TZ }).format(d)
  const day     = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: TZ }).format(d)
  const time    = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).format(d)
  return `${weekday} ${month} ${day} • ${time} CT`
}

/**
 * Takes match_date (YYYY-MM-DD or full ISO) and match_time (HH:MM:SS, UTC).
 * Combines them as a UTC timestamp and formats in CT.
 * Returns: "Mon Jun 11 • 2:00 PM CT" (EN) or "Lun 11 Jun • 14:00 CT" (ES)
 */
export function formatMatchTime(date: string, time: string, lang: string): string {
  // Strip any existing timezone suffix from the time
  const cleanTime = time.replace(/([Z+]|\+\d{2}:\d{2})$/, '')
  // Accept both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss+00:00' as date arg
  const datePart = date.split('T')[0]
  // Append +00:00 explicitly so JS treats the combined string as UTC
  const d = new Date(`${datePart}T${cleanTime}+00:00`)
  if (isNaN(d.getTime())) return `${date} ${time}`
  return formatDate(d, lang)
}

/**
 * Convenience wrapper for a full ISO timestamp (match_date from Supabase).
 * Returns: "Mon Jun 11 • 2:00 PM CT" (EN) or "Lun 11 Jun • 14:00 CT" (ES)
 */
export function formatMatchDateTime(iso: string, lang: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return formatDate(d, lang)
}

/**
 * Compact format for deadline labels.
 * Returns: "Jun 11 at 2:00 PM CT" (EN) or "11 Jun a las 14:00 CT" (ES)
 */
export function formatDeadlineShort(iso: string, lang: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso

  if (lang === 'es') {
    const day   = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: TZ }).format(d)
    const month = cap(new Intl.DateTimeFormat('es', { month: 'short', timeZone: TZ }).format(d))
    const time  = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(d)
    return `${day} ${month} a las ${time} CT`
  }

  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: TZ }).format(d)
  const day   = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: TZ }).format(d)
  const time  = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).format(d)
  return `${month} ${day} at ${time} CT`
}
