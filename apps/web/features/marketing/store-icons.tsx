/** Simple inline SVG brand icons for the app-store download buttons. */

export function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Play-store triangle glyph */}
      <path d="M3.18 23.76c.37.2.8.21 1.18.03l12.65-7.3-2.76-2.77L3.18 23.76Z" />
      <path d="m20.82 10.43-2.97-1.72L14.85 12l2.99 2.99 3-1.73a1.35 1.35 0 0 0 0-2.83Z" />
      <path d="M2.06 1.5A1.35 1.35 0 0 0 1.5 2.64v18.72c0 .46.24.87.6 1.1l10.9-10.9L2.06 1.5Z" />
      <path d="M4.36.21 14.85 10.7l-2.76 2.77L2.44.34A1.36 1.36 0 0 1 4.36.21Z" />
    </svg>
  );
}

export function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Apple glyph */}
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
    </svg>
  );
}
