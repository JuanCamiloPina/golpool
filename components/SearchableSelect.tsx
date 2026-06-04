'use client'

import { useState, useRef, useEffect } from 'react'

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  /** Map of option string → flagcdn.com 2-letter code, e.g. { "Argentina": "ar" } */
  icons?: Record<string, string>
  placeholder?: string
  hint?: string
  disabled?: boolean
}

function FlagInline({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
      width={24}
      height={18}
      alt=""
      className="rounded-sm shrink-0"
    />
  )
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  icons,
  placeholder = 'Search and select…',
  hint,
  disabled,
}: SearchableSelectProps) {
  const [query, setQuery]   = useState(value)
  const [open, setOpen]     = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  // Sync display when external value changes (e.g. language switch)
  useEffect(() => { setQuery(value) }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function checkDropDirection() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    // Open upward if less than 280px below the input in the viewport
    setDropUp(window.innerHeight - rect.bottom < 280)
  }

  const filtered = (
    query.trim()
      ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
      : options
  ).slice(0, 50)

  function onBlur() {
    setOpen(false)
    if (options.length > 0 && !options.includes(query)) {
      setQuery(value)
    }
  }

  // Show flag overlay when a valid option is selected and the dropdown is closed
  const selectedCode = !open && query && icons?.[query] ? icons[query] : null

  const dropdownClass = dropUp
    ? 'absolute z-30 bottom-full mb-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg'
    : 'absolute z-30 top-full mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg'

  return (
    <div>
      <div ref={containerRef} className="relative">
        {/* Flag overlay — shown when a flagged option is selected and input is idle */}
        {selectedCode && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
            <FlagInline code={selectedCode} />
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => { checkDropDirection(); setOpen(true) }}
          onBlur={onBlur}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          className={`w-full rounded-lg border border-gray-300 py-2 pr-3 text-sm text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 ${selectedCode ? 'pl-10' : 'pl-3'}`}
        />

        {open && !disabled && filtered.length > 0 && (
          <ul className={dropdownClass}>
            {filtered.map((o) => (
              <li
                key={o}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setQuery(o)
                  onChange(o)
                  setOpen(false)
                }}
                className={`flex items-center gap-2 cursor-pointer px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700 ${
                  o === value ? 'bg-green-50 font-medium text-green-700' : 'text-gray-700'
                }`}
              >
                {icons?.[o] && <FlagInline code={icons[o]} />}
                {o}
              </li>
            ))}
          </ul>
        )}

        {open && !disabled && filtered.length === 0 && query.trim() && (
          <div className={dropUp
            ? 'absolute z-30 bottom-full mb-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg'
            : 'absolute z-30 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg'
          }>
            No matches
          </div>
        )}
      </div>

      {hint && !disabled && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  )
}
