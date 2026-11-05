import { expect, test } from '@playwright/test'

test('the health check answers once the database is readable', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ status: 'ok' })
})
