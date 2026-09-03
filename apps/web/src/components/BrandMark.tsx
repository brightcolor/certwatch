/* The product mark: a shield with a certificate check. Single-colour so it
   works on any surface, at any size, in either theme. */
export function BrandMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2.2 20 5.2v6.1c0 4.9-3.3 8.1-8 9.5-4.7-1.4-8-4.6-8-9.5V5.2l8-3Z"
        fill="currentColor"
        fillOpacity=".14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.4 11.7 2.4 2.4 4.8-5.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
