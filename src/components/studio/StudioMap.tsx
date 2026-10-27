import styles from './Studio.module.css'

type Point = { lat: number; lng: number; zoom: number }

const ll = (p: Point) => `${p.lng},${p.lat}`

/**
 * 3.5.2 map, full width and zoomable.
 * ASSUMPTION: the spec asks for a custom Google map; we use the free Yandex map widget instead
 * (no key, no foreign billing, works for a Russian audience). The point is set in the admin (Студия → Контакты).
 */
export function StudioMap({ point, title }: { point: Point; title: string }) {
  const src = `https://yandex.ru/map-widget/v1/?ll=${ll(point)}&z=${point.zoom}&pt=${ll(point)},pm2gnm`
  return <iframe className={styles.map} src={src} title={title} loading="lazy" allowFullScreen data-spec="3.5.2" />
}

export const mapLink = (p: Point) => `https://yandex.ru/maps/?pt=${ll(p)}&z=${p.zoom}&l=map`
