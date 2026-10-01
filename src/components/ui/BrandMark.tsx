/**
 * Inline SVG fallback icon used by the PWA install banner and any place
 * we need a tiny brand glyph at zero asset cost. The TAS letters in a
 * rounded square — mirrors the home-screen icon shape.
 */
export function BrandMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#0B0B0C" />
      <text
        x="32"
        y="42"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="28"
        textAnchor="middle"
        fill="#C7A24B"
        letterSpacing="2"
      >
        T
      </text>
    </svg>
  );
}