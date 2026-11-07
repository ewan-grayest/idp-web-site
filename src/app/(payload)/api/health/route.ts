import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

/**
 * Health check for Docker and hosting platforms: 200 once the site can read its database, 503 otherwise.
 * The first call also applies pending migrations, so they run at start and not on the first visitor's request.
 * The reason goes to the log only.
 */
export async function GET() {
  try {
    const payload = await getPayload({ config })
    await payload.count({ collection: 'users' })
    return Response.json({ status: 'ok' })
  } catch (error) {
    console.error('Health check failed:', error)
    return Response.json({ status: 'error' }, { status: 503 })
  }
}
