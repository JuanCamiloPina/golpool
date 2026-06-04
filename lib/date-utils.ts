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
    return `${weekday} ${day} ${month} • ${time} CST`
  }
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ }).format(d)
  const month   = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: TZ }).format(d)
  const day     = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: TZ }).format(d)
  const time    = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).format(d)
  return `${weekday} ${month} ${day} • ${time} CST`
}

/**
 * Takes separate YYYY-MM-DD and HH:MM:SS fields (as stored in the DB).
 * Returns: "Mon Jun 11 • 2:00 PM CST" (EN) or "Lun 11 Jun • 14:00 CST" (ES)
 */
export function formatMatchTime(date: string, time: string, lang: string): string {
  const cleanTime = time.replace(/([Z+]|\+\d{2}:\d{2})$/, '')
  const d = new Date(`${date}T${cleanTime}`)
  if (isNaN(d.getTime())) return `${date} ${time}`
  return formatDate(d, lang)
}

/**
 * Convenience wrapper for a full ISO timestamp (match_date from Supabase).
 * Returns: "Mon Jun 11 • 2:00 PM CST" (EN) or "Lun 11 Jun • 14:00 CST" (ES)
 */
export function formatMatchDateTime(iso: string, lang: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return formatDate(d, lang)
}

/**
 * Compact format for deadline labels.
 * Returns: "Jun 11 at 2:00 PM CST" (EN) or "11 Jun a las 14:00 CST" (ES)
 */
export function formatDeadlineShort(iso: string, lang: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso

  if (lang === 'es') {
    const day   = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: TZ }).format(d)
    const month = cap(new Intl.DateTimeFormat('es', { month: 'short', timeZone: TZ }).format(d))
    const time  = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(d)
    return `${day} ${month} a las ${time} CST`
  }

  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: TZ }).format(d)
  const day   = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: TZ }).format(d)
  const time  = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).format(d)
  return `${month} ${day} at ${time} CST`
}
