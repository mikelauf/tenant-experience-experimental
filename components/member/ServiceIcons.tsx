/** Small isometric illustrations, shaded like objects (Airbnb's Homes / Experiences / Services tabs). */

export function SpacesArt({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="sa-top" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9a6a44" />
          <stop offset="1" stopColor="#6f4a2f" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="52" rx="22" ry="6" fill="#111315" opacity="0.08" />
      {/* back chair */}
      <path d="M40 18l8 4.6v10L40 28z" fill="#3a3e42" />
      <path d="M40 28l8 4.6-5 2.9-8-4.6z" fill="#55595e" />
      {/* table top */}
      <path d="M32 22l20 11.5L32 45 12 33.5z" fill="url(#sa-top)" />
      <path d="M12 33.5V36l20 11.5V45z" fill="#5a3b24" />
      <path d="M52 33.5V36L32 47.5V45z" fill="#4a3020" />
      {/* legs */}
      <path d="M20 39v9M44 39v9M32 47.5v4" stroke="#3b2717" strokeWidth="2" strokeLinecap="round" />
      {/* front chair */}
      <path d="M15 40l7 4v9l-7-4z" fill="#2a2d30" />
      <path d="M15 40l6-3.4 7 4-6 3.4z" fill="#62666a" />
      {/* laptop */}
      <path d="M29 30l7 4-4 2.3-7-4z" fill="#d9d9d3" />
      <path d="M29 30v-6l7 4v6z" fill="#eceae4" />
    </svg>
  );
}

export function FitnessArt({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="fa-bell" cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#5b6166" />
          <stop offset="0.55" stopColor="#23272a" />
          <stop offset="1" stopColor="#0f1113" />
        </radialGradient>
        <linearGradient id="fa-band" x1="0" x2="1">
          <stop offset="0" stopColor="#b44d2d" />
          <stop offset="1" stopColor="#7c3019" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="55" rx="16" ry="4.5" fill="#111315" opacity="0.1" />
      <path d="M20 26c0-10 5-15 12-15s12 5 12 15" fill="none" stroke="#2a2d30" strokeWidth="5" strokeLinecap="round" />
      <path d="M21.5 24c0-8 4-12.5 10.5-12.5" fill="none" stroke="#6a7075" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="32" cy="38" r="16" fill="url(#fa-bell)" />
      <path d="M17.2 42a16 16 0 0 0 29.6 0" fill="none" stroke="url(#fa-band)" strokeWidth="3.4" />
      <ellipse cx="26" cy="31" rx="4" ry="2.4" fill="#fff" opacity="0.18" transform="rotate(-30 26 31)" />
    </svg>
  );
}

export function EventsArt({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="ea-cup" x1="0" x2="1">
          <stop offset="0" stopColor="#faf9f6" />
          <stop offset="1" stopColor="#d9d5cc" />
        </linearGradient>
      </defs>
      <ellipse cx="30" cy="53" rx="20" ry="5.5" fill="#111315" opacity="0.08" />
      {/* saucer */}
      <ellipse cx="30" cy="48" rx="19" ry="6" fill="#e6e2d9" />
      <ellipse cx="30" cy="47" rx="19" ry="5.5" fill="#f4f2ec" />
      {/* cup */}
      <path d="M17 28h26l-3 16c-.6 2.6-4.8 4.2-10 4.2s-9.4-1.6-10-4.2z" fill="url(#ea-cup)" />
      <path d="M43 31c6 0 7.5 3 7.5 5.5S48 43 41 43" fill="none" stroke="#d9d5cc" strokeWidth="3" />
      <ellipse cx="30" cy="28" rx="13" ry="3.6" fill="#ece9e2" />
      <ellipse cx="30" cy="28.6" rx="11" ry="2.8" fill="#5a3522" />
      <ellipse cx="27" cy="28.2" rx="4" ry="0.9" fill="#b0714a" opacity="0.7" />
      {/* steam */}
      <path d="M25 22c-2-3 2-4 0-8M31 21c-2-3 2-4 0-8M37 22c-2-3 2-4 0-8" fill="none" stroke="#9a3f25" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
