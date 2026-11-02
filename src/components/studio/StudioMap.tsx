import styles from './Studio.module.css'

type Point = { lat: number; lng: number; zoom: number; provider?: 'google' | 'yandex' }

const ll = (p: Point) => `${p.lng},${p.lat}`

/**
 * 3.5.2 map, full width and zoomable.
 * Google/Yandex provider is configurable in Site settings. Coordinates and zoom are set in Studio → Contacts.
 */
export function StudioMap({ point, title, spec = '3.5.2' }: { point: Point; title: string; spec?: string }) {
  const src = point.provider === 'google'
    ? `https://maps.google.com/maps?q=${point.lat},${point.lng}&z=${point.zoom}&output=embed`
    : `https://yandex.ru/map-widget/v1/?ll=${ll(point)}&z=${point.zoom}&pt=${ll(point)},pm2gnm`
  return <iframe className={styles.map} src={src} title={title} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" data-spec={spec} />
}

export const mapLink = (p: Point) => p.provider === 'google'
  ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
  : `https://yandex.ru/maps/?pt=${ll(p)}&z=${p.zoom}&l=map`
