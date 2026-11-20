/**
 * How the site crops a photo, for the admin's cropping grid and for the pages themselves.
 *
 * Every photo box on the site fills itself with `object-fit: cover`, which keeps the whole width or the whole height
 * of the photo and cuts the other side. Since 2026-11-20 the cut follows the photo's focal point, set in the admin
 * (Payload's `focalX` / `focalY`, in % of the photo): the browser lines the focal point up with the same place in the
 * box (`object-position: X% Y%`), so it is always on screen and the cut falls where there is room for it.
 * Untouched photos keep 50% 50%, the centre crop they always had (Ewan, 2026-11-20).
 */

/** A focal point in % of the photo, from the top left corner. */
export type Focus = { x: number; y: number }

/** A part of the photo in fractions of its width and height (0 to 1), from the top left corner. */
export type Rect = { x: number; y: number; w: number; h: number }

export type CropGroup = 'home' | 'project' | 'cards' | 'wide'

/**
 * A box on the site that a photo covers. `aspect` is the box's width over its height, measured at the usual screen
 * sizes (1440×900, 1920×1080, 1024×768, 768×1024, 390×844). `window` is the share of the box's width actually on
 * screen, centred: a Home half shows the middle of a slide as wide as the screen. `upright`: only upright photos
 * get this box (the tall cards of the project lists).
 */
export type CropFormat = { id: string; group: CropGroup; aspect: number; window?: number; upright?: boolean }

export const cropGroups: CropGroup[] = ['home', 'project', 'cards', 'wide']

/** Every place that crops a photo, grouped by where it is. Labels: `formats` in components/admin/media/texts.ts. */
export const cropFormats: CropFormat[] = [
  // Home sliders 1.2 / 1.3 (HomeSliders.module.css): a slide is the whole screen, a half shows its middle
  { id: 'homeLaptop', group: 'home', aspect: 1440 / 900, window: 0.5 },
  { id: 'homeWide', group: 'home', aspect: 1920 / 1080, window: 0.5 },
  { id: 'homeOpen', group: 'home', aspect: 1920 / 1080 },
  { id: 'homeTablet', group: 'home', aspect: 768 / 1024, window: 0.5 },
  { id: 'homePhone', group: 'home', aspect: 390 / 422 },
  // Project page (Project.module.css): strip 5.1 with 7 frames, the frame under the pointer, phones; stages 5.4–5.6
  { id: 'strip', group: 'project', aspect: 1440 / 7 / 560 },
  { id: 'stripOpen', group: 'project', aspect: (1440 * 2.6) / 7 / 560 },
  { id: 'stripPhone', group: 'project', aspect: (390 * 0.4) / 344 },
  { id: 'stage', group: 'project', aspect: 560 / 452 },
  // Cards: project lists 7.2 (4:3, upright 2:3), recommendations 5.11, the person's projects, journal covers, feeds
  { id: 'card', group: 'cards', aspect: 4 / 3 },
  { id: 'cardTall', group: 'cards', aspect: 2 / 3, upright: true },
  { id: 'recommended', group: 'cards', aspect: 368 / 420 },
  { id: 'square', group: 'cards', aspect: 1 },
  { id: 'journal', group: 'cards', aspect: 260 / 340 },
  // Wide frames: author 5.2 and person 4.1 (the screen's width × 640, phones 260 high), partner photo 6.3.5,
  // press 10 (16:10), entries of pages 11, 13 and 14 (480×320)
  { id: 'banner', group: 'wide', aspect: 1440 / 640 },
  { id: 'bannerPhone', group: 'wide', aspect: 390 / 260 },
  { id: 'wide', group: 'wide', aspect: 16 / 9 },
  { id: 'press', group: 'wide', aspect: 16 / 10 },
  { id: 'entries', group: 'wide', aspect: 480 / 320 },
]

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

type Focal = { focalX?: number | null; focalY?: number | null }

/** The photo's focal point; the centre when it has none. */
export function focusOf(m: Focal | number | null | undefined): Focus {
  const f = typeof m === 'object' && m ? m : {}
  const pick = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, 100) : 50)
  return { x: pick(f.focalX), y: pick(f.focalY) }
}

/**
 * The CSS `object-position` for a photo, or undefined for the centre, so photos nobody touched keep their markup.
 * Accepts a media document or a bare id (an unpopulated relation), like the other helpers in lib/projects.ts.
 */
export function objectPosition(m: Focal | number | null | undefined): string | undefined {
  const { x, y } = focusOf(m)
  return x === 50 && y === 50 ? undefined : `${x}% ${y}%`
}

/** What a box of this format shows of the photo, as `object-fit: cover` and `object-position: focus` crop it. */
export function coverRect(photo: { width: number; height: number }, format: Pick<CropFormat, 'aspect' | 'window'>, focus: Focus): Rect {
  const ratio = photo.width / photo.height
  // A box wider than the photo keeps its full width and cuts the height, and the other way round
  const w = format.aspect > ratio ? 1 : format.aspect / ratio
  const h = format.aspect > ratio ? ratio / format.aspect : 1
  const rect = { x: (1 - w) * (clamp(focus.x, 0, 100) / 100), y: (1 - h) * (clamp(focus.y, 0, 100) / 100), w, h }
  const window = clamp(format.window ?? 1, 0, 1)
  return window < 1 ? { ...rect, x: rect.x + (rect.w * (1 - window)) / 2, w: rect.w * window } : rect
}

/** The part of the photo every one of these boxes shows, or null when no part is in all of them. */
export function intersect(rects: Rect[]): Rect | null {
  if (!rects.length) return null
  const x = Math.max(...rects.map((r) => r.x))
  const y = Math.max(...rects.map((r) => r.y))
  const right = Math.min(...rects.map((r) => r.x + r.w))
  const bottom = Math.min(...rects.map((r) => r.y + r.h))
  const eps = 1e-9
  return right - x > eps && bottom - y > eps ? { x, y, w: right - x, h: bottom - y } : null
}

/** The smallest rectangle around all of these boxes: beyond it, only the full screen viewer shows the photo. */
export function bounds(rects: Rect[]): Rect | null {
  if (!rects.length) return null
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y }
}

/** Upright: taller than wide by 5% or more, as the project lists decide it (CollectionPage `data-shape`). */
export const isUpright = (photo: { width: number; height: number }) => photo.height / photo.width >= 1.05

/** The formats of these groups that can show this photo. */
export const formatsFor = (photo: { width: number; height: number }, groups: readonly CropGroup[]) =>
  cropFormats.filter((f) => groups.includes(f.group) && (!f.upright || isUpright(photo)))

/** A focal point from a spot on the photo given in fractions of its width and height, rounded as Payload stores it. */
export const focusAt = (fx: number, fy: number): Focus => ({ x: Math.round(clamp(fx, 0, 1) * 100), y: Math.round(clamp(fy, 0, 1) * 100) })
