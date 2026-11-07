import { ThirdPartyFrame } from '@/components/shared/ThirdPartyFrame'
import styles from './Studio.module.css'

type Point = { lat: number; lng: number; zoom: number; provider?: 'google' | 'yandex' }

const ll = (p: Point) => `${p.lng},${p.lat}`

/**
 * 3.5.2 map, full width and zoomable. Coordinates and zoom are set in Studio → Contacts.
 * Always Yandex Maps: Google Maps would pass visitors' IP addresses abroad (152-ФЗ), so it is no longer offered.
 * The map loads only once the visitor allows third-party services (cookie notice) or asks for it.
 */
export function StudioMap({ point, title, spec = '3.5.2' }: { point: Point; title: string; spec?: string }) {
  const src = `https://yandex.ru/map-widget/v1/?ll=${ll(point)}&z=${point.zoom}&pt=${ll(point)},pm2gnm`
  return <ThirdPartyFrame className={styles.map} src={src} title={title} spec={spec} />
}

export const mapLink = (p: Point) => `https://yandex.ru/maps/?pt=${ll(p)}&z=${p.zoom}&l=map`
