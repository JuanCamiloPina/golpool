interface FlagImageProps {
  countryCode: string
  size?: string
}

export default function FlagImage({ countryCode, size = '24x18' }: FlagImageProps) {
  if (!countryCode) return null
  const [w, h] = size.split('x').map(Number)
  return (
    <img
      src={`https://flagcdn.com/${size}/${countryCode.toLowerCase()}.png`}
      width={w}
      height={h}
      alt=""
      className="rounded-sm inline-block shrink-0"
    />
  )
}
