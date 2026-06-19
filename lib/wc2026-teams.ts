import type { Lang } from './i18n'

// Country flag emojis keyed by English name (same keys as WC2026_TEAMS)
export const FLAGS: Record<string, string> = {
  'Algeria':            '🇩🇿',
  'Argentina':          '🇦🇷',
  'Australia':          '🇦🇺',
  'Austria':            '🇦🇹',
  'Belgium':            '🇧🇪',
  'Bosnia-Herzegovina': '🇧🇦',
  'Brazil':             '🇧🇷',
  'Canada':             '🇨🇦',
  'Cape Verde':         '🇨🇻',
  'Colombia':           '🇨🇴',
  'Croatia':            '🇭🇷',
  'Curacao':            '🇨🇼',
  'Czech Republic':     '🇨🇿',
  'DR Congo':           '🇨🇩',
  'Ecuador':            '🇪🇨',
  'Egypt':              '🇪🇬',
  'England':            '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France':             '🇫🇷',
  'Germany':            '🇩🇪',
  'Ghana':              '🇬🇭',
  'Haiti':              '🇭🇹',
  'Iran':               '🇮🇷',
  'Iraq':               '🇮🇶',
  'Ivory Coast':        '🇨🇮',
  'Japan':              '🇯🇵',
  'Jordan':             '🇯🇴',
  'Mexico':             '🇲🇽',
  'Morocco':            '🇲🇦',
  'Netherlands':        '🇳🇱',
  'New Zealand':        '🇳🇿',
  'Norway':             '🇳🇴',
  'Panama':             '🇵🇦',
  'Paraguay':           '🇵🇾',
  'Portugal':           '🇵🇹',
  'Qatar':              '🇶🇦',
  'Saudi Arabia':       '🇸🇦',
  'Scotland':           '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Senegal':            '🇸🇳',
  'South Africa':       '🇿🇦',
  'South Korea':        '🇰🇷',
  'Spain':              '🇪🇸',
  'Sweden':             '🇸🇪',
  'Switzerland':        '🇨🇭',
  'Tunisia':            '🇹🇳',
  'Turkey':             '🇹🇷',
  'USA':                '🇺🇸',
  'Uruguay':            '🇺🇾',
  'Uzbekistan':         '🇺🇿',
}

/**
 * Return the flag emoji for an English team name.
 * Falls back to empty string if not found.
 */
export function getTeamFlag(englishName: string): string {
  return FLAGS[englishName] ?? ''
}

// Exact English names as stored in the matches table (migration 008)
export const WC2026_TEAMS: string[] = [
  'Algeria', 'Argentina', 'Australia', 'Austria', 'Belgium',
  'Bosnia-Herzegovina', 'Brazil', 'Canada', 'Cape Verde', 'Colombia',
  'Croatia', 'Curacao', 'Czech Republic', 'DR Congo', 'Ecuador',
  'Egypt', 'England', 'France', 'Germany', 'Ghana',
  'Haiti', 'Iran', 'Iraq', 'Ivory Coast', 'Japan',
  'Jordan', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
  'Norway', 'Panama', 'Paraguay', 'Portugal', 'Qatar',
  'Saudi Arabia', 'Scotland', 'Senegal', 'South Africa', 'South Korea',
  'Spain', 'Sweden', 'Switzerland', 'Tunisia', 'Turkey',
  'USA', 'Uruguay', 'Uzbekistan',
]

// English → Spanish name map (all 48 WC2026 teams)
const ES_NAMES: Record<string, string> = {
  'Algeria':            'Argelia',
  'Argentina':          'Argentina',
  'Australia':          'Australia',
  'Austria':            'Austria',
  'Belgium':            'Bélgica',
  'Bosnia-Herzegovina': 'Bosnia-Herzegovina',
  'Brazil':             'Brasil',
  'Canada':             'Canadá',
  'Cape Verde':         'Cabo Verde',
  'Colombia':           'Colombia',
  'Croatia':            'Croacia',
  'Curacao':            'Curazao',
  'Czech Republic':     'República Checa',
  'DR Congo':           'Congo RD',
  'Ecuador':            'Ecuador',
  'Egypt':              'Egipto',
  'England':            'Inglaterra',
  'France':             'Francia',
  'Germany':            'Alemania',
  'Ghana':              'Ghana',
  'Haiti':              'Haití',
  'Iran':               'Irán',
  'Iraq':               'Irak',
  'Ivory Coast':        'Costa de Marfil',
  'Japan':              'Japón',
  'Jordan':             'Jordania',
  'Mexico':             'México',
  'Morocco':            'Marruecos',
  'Netherlands':        'Países Bajos',
  'New Zealand':        'Nueva Zelanda',
  'Norway':             'Noruega',
  'Panama':             'Panamá',
  'Paraguay':           'Paraguay',
  'Portugal':           'Portugal',
  'Qatar':              'Catar',
  'Saudi Arabia':       'Arabia Saudita',
  'Scotland':           'Escocia',
  'Senegal':            'Senegal',
  'South Africa':       'Sudáfrica',
  'South Korea':        'Corea del Sur',
  'Spain':              'España',
  'Sweden':             'Suecia',
  'Switzerland':        'Suiza',
  'Tunisia':            'Túnez',
  'Turkey':             'Turquía',
  'USA':                'Estados Unidos',
  'Uruguay':            'Uruguay',
  'Uzbekistan':         'Uzbekistán',
}

// Spanish → English reverse map (auto-built)
const EN_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(ES_NAMES).map(([en, es]) => [es, en])
)

/**
 * Translate an English team name (as stored in DB) to the display language.
 * Falls back to the input if no translation exists.
 */
export function getTeamName(englishName: string, lang: Lang): string {
  if (lang === 'es') return ES_NAMES[englishName] ?? englishName
  return englishName
}

/**
 * Convert a display-language team name back to the canonical English name
 * used for storage and scoring. Safe to call with English input (no-op).
 */
export function getTeamEnglishName(displayName: string): string {
  return EN_NAMES[displayName] ?? displayName
}

/**
 * Return the full list of team names in the requested display language,
 * sorted alphabetically in that language.
 */
export function getTeamOptions(lang: Lang): string[] {
  if (lang === 'es') {
    return WC2026_TEAMS.map((t) => ES_NAMES[t] ?? t).sort((a, b) =>
      a.localeCompare(b, 'es')
    )
  }
  return WC2026_TEAMS
}

// 2-letter ISO 3166-1 alpha-2 codes for flag images (e.g. flagcdn.com)
export const FLAG_CODES: Record<string, string> = {
  'Algeria':            'dz',
  'Argentina':          'ar',
  'Australia':          'au',
  'Austria':            'at',
  'Belgium':            'be',
  'Bosnia-Herzegovina': 'ba',
  'Brazil':             'br',
  'Cameroon':           'cm',
  'Canada':             'ca',
  'Cape Verde':         'cv',
  'Chile':              'cl',
  'Colombia':           'co',
  'Croatia':            'hr',
  'Curacao':            'cw',
  'Czech Republic':     'cz',
  'DR Congo':           'cd',
  'Ecuador':            'ec',
  'Egypt':              'eg',
  'England':            'gb-eng',
  'France':             'fr',
  'Germany':            'de',
  'Ghana':              'gh',
  'Haiti':              'ht',
  'Hungary':            'hu',
  'Indonesia':          'id',
  'Iran':               'ir',
  'Iraq':               'iq',
  'Italy':              'it',
  'Ivory Coast':        'ci',
  'Japan':              'jp',
  'Jordan':             'jo',
  'Kenya':              'ke',
  'Mali':               'ml',
  'Mexico':             'mx',
  'Morocco':            'ma',
  'Netherlands':        'nl',
  'New Zealand':        'nz',
  'Nigeria':            'ng',
  'Norway':             'no',
  'Panama':             'pa',
  'Paraguay':           'py',
  'Peru':               'pe',
  'Poland':             'pl',
  'Portugal':           'pt',
  'Qatar':              'qa',
  'Romania':            'ro',
  'Saudi Arabia':       'sa',
  'Scotland':           'gb-sct',
  'Senegal':            'sn',
  'Serbia':             'rs',
  'Slovenia':           'si',
  'South Africa':       'za',
  'South Korea':        'kr',
  'Spain':              'es',
  'Sweden':             'se',
  'Switzerland':        'ch',
  'Togo':               'tg',
  'Tunisia':            'tn',
  'Turkey':             'tr',
  'USA':                'us',
  'Uruguay':            'uy',
  'Uzbekistan':         'uz',
}

/**
 * Return the 2-letter ISO flag code for an English team name.
 * Returns '' if not found. Pass to <FlagImage countryCode={...} />.
 */
export function getTeamFlagCode(englishName: string): string {
  return FLAG_CODES[englishName] ?? ''
}

/**
 * Return a map of display name → flag code for all 48 WC2026 teams,
 * keyed by the translated display name for the given language.
 * Suitable for passing as `icons` to SearchableSelect.
 * Example (EN): { "Argentina": "ar", "Brazil": "br", … }
 * Example (ES): { "Argentina": "ar", "Brasil": "br", … }
 */
export function getTeamFlagCodesMap(lang: Lang): Record<string, string> {
  const result: Record<string, string> = {}
  for (const englishName of WC2026_TEAMS) {
    const code = FLAG_CODES[englishName]
    if (code) result[getTeamName(englishName, lang)] = code
  }
  return result
}
