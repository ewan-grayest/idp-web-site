const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const PhoneIcon = () => (
  <svg {...base}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
)

export const MailIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

export const SendIcon = () => (
  <svg {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.5-4.5" />
  </svg>
)

export const ArrowIcon = ({ dir = 'right' }: { dir?: 'left' | 'right' }) => (
  <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
    <path d={dir === 'right' ? 'M0 6h20M15 1l5 5-5 5' : 'M22 6H2M7 1 2 6l5 5'} />
  </svg>
)

export const ChevronIcon = ({ dir = 'right' }: { dir?: 'left' | 'right' }) => (
  <svg {...base}>
    <path d={dir === 'right' ? 'm9.5 5 7 7-7 7' : 'm14.5 5-7 7 7 7'} />
  </svg>
)

export const PauseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
    <rect x="1.5" y="1" width="2.2" height="8" rx="0.5" />
    <rect x="6.3" y="1" width="2.2" height="8" rx="0.5" />
  </svg>
)

export const CloseIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
    <path d="M5 5l14 14M19 5 5 19" />
  </svg>
)

export const PlayIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
)

export const SoundIcon = ({ muted }: { muted?: boolean }) => (
  <svg {...base} width={24} height={24}>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
    <path d={muted ? 'm16 9.5 5 5m0-5-5 5' : 'M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11'} />
  </svg>
)

export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const MoonIcon = () => (
  <svg {...base}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </svg>
)

export const MenuIcon = () => (
  <svg {...base}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
)
