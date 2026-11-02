/** Defaults from spec 7.1.2, 3.8, 4.5, 6.7, 5.12 and 5.9.2. */
export const defaultLimits = { maxTags: 5, studioPosts: 12, personPosts: 12, partnerPosts: 12, projectPosts: 3, latestReviews: 5 } as const
export type Limits = { [K in keyof typeof defaultLimits]: number }

/** Treat absent/invalid settings as defaults. Always bound requests, including direct API/query-string use. */
export function resolveLimits(input?: Partial<Record<keyof Limits, number | null>> | null): Limits {
  return Object.fromEntries(Object.entries(defaultLimits).map(([key, fallback]) => {
    const value = input?.[key as keyof Limits]
    return [key, typeof value === 'number' && Number.isFinite(value) && value >= 1 ? Math.min(100, Math.floor(value)) : fallback]
  })) as Limits
}

export function selectTags(requested: string | string[] | undefined, available: string[], max: number): string[] {
  const allowed = new Set(available)
  return [...new Set([requested ?? []].flat().flatMap((v) => v.split(',')).map((v) => v.trim()).filter((v) => allowed.has(v)))].slice(0, max)
}
