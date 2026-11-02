import { expect, test } from '@playwright/test'

import { accountFor, password } from './accounts'

// «Резервные копии»: make a backup from the admin page, check it, download it, then delete it.
// Restore is not run here: it replaces the whole database and restarts the site (see BACKUP.md for that test).
test('A backup made from the admin page checks out, downloads and deletes', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'One device is enough: backups run one at a time')
  test.setTimeout(120_000)
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(accountFor(testInfo.project.name))
  await page.locator('#field-password').fill(password)
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/admin$/)

  // The side menu link (collapsed at this width), then the page itself
  await expect(page.locator('#nav-backups')).toHaveAttribute('href', '/admin/backups')
  await page.goto('/admin/backups')
  await expect(page.getByRole('heading', { name: /Резервные копии|Backups|备份/ })).toBeVisible()
  await page.locator('#backup-create').click()
  await expect(page.locator('[data-job-state=done]')).toBeVisible({ timeout: 60_000 })

  const row = page.locator('tr[data-backup]').first()
  const name = await row.getAttribute('data-backup')
  expect(name).toMatch(/^idp-(local|prod)-\d{4}-\d{2}-\d{2}_\d{6}\.tar$/)

  await row.getByRole('button', { name: /Проверить|Check|检查/ }).click()
  await expect(page.locator('[data-job-state=done]')).toBeVisible({ timeout: 60_000 })
  await expect(row).toContainText(/в порядке|OK|正常/)

  const download = await page.request.get(`/api/v1/backups/${name}/download`)
  expect(download.status()).toBe(200)
  expect((await download.body()).subarray(0, 12).toString()).toBe('manifest.txt')

  const removed = await page.request.delete(`/api/v1/backups/${name}`)
  expect(removed.status()).toBe(200)
  const list = await (await page.request.get('/api/v1/backups')).json()
  expect(list.backups.map((b: { name: string }) => b.name)).not.toContain(name)
})

test('Backups are for signed-in admin users only', async ({ request }) => {
  expect((await request.get('/api/v1/backups')).status()).toBe(401)
  expect((await request.post('/api/v1/backups')).status()).toBe(401)
})
