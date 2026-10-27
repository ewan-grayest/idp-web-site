import { expect, request, type FullConfig } from '@playwright/test'

import { accountFor, adminEmail, password } from './accounts'

/**
 * One admin user per device project. Payload keeps a user's sessions in one database row, so the
 * desktop and phone tests signing in and out as the same user at the same moment drop each other's session.
 */
export default async function globalSetup(config: FullConfig) {
  const api = await request.newContext({ baseURL: config.projects[0].use.baseURL })
  const login = await api.post('/api/v1/users/login', { data: { email: adminEmail, password } })
  if (!login.ok()) {
    const first = await api.post('/api/v1/users/first-register', { data: { email: adminEmail, password } })
    expect(first.ok(), 'No admin user: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD').toBeTruthy()
  }
  for (const { name } of config.projects) {
    const email = accountFor(name)
    const found = await api.get('/api/v1/users', { params: { 'where[email][equals]': email, limit: 1 } })
    if ((await found.json()).totalDocs) continue
    const made = await api.post('/api/v1/users', { data: { email, password, name: `E2E ${name}` } })
    expect(made.ok(), await made.text()).toBeTruthy()
  }
  await api.dispose()
}
