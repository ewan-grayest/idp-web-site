import { expect, test, type Page } from '@playwright/test'

import { accountFor, password } from './accounts'

/** The id of the task the site shows now, if any */
const currentTask = async (page: Page) => (await (await page.request.get('/api/v1/backups')).json()).job?.id as string | undefined

/**
 * Waits for a task started after `before` to finish. The page can still show an earlier task as done, from another
 * test or a dev server kept running, so its «done» alone says nothing about this one
 */
async function finished(page: Page, before: string | undefined) {
  await expect
    .poll(async () => {
      const { job } = await (await page.request.get('/api/v1/backups')).json()
      return job && job.id !== before ? job.state : 'not started'
    }, { timeout: 60_000 })
    .toBe('done')
  await expect(page.locator('[data-job-state=done]')).toBeVisible()
}

// «Резервные копии»: make a backup from the admin page, check it, download it, then delete it.
// Restore is not run here: it replaces the whole database and restarts the site (see BACKUP.md for that test).
test('A backup made from the admin page checks out, downloads and deletes', async ({ page, request, isMobile }, testInfo) => {
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
  const before = await currentTask(page)
  await page.locator('#backup-create').click()
  await finished(page, before)
  // How long it took, by the server's clock
  await expect(page.locator('[data-job-state=done] h2')).toContainText(/\d+:\d\d/)

  // The page follows the task by its id, without sign-in (a restore replaces the accounts), and the task's author stays private
  const { job } = await (await page.request.get('/api/v1/backups')).json()
  const followed = await request.get(`/api/v1/backups/job/${job.id}`)
  expect(followed.status()).toBe(200)
  const shown = (await followed.json()).job
  expect(shown).toMatchObject({ id: job.id, kind: 'create', state: 'done' })
  expect(shown).not.toHaveProperty('by')
  // A finished task can't be stopped
  const stop = await page.request.post(`/api/v1/backups/job/${job.id}/cancel`)
  expect(stop.status()).toBe(409)
  expect((await stop.json()).key).toBe('notRunning')

  const row = page.locator('tr[data-backup]').first()
  const name = await row.getAttribute('data-backup')
  expect(name).toMatch(/^idp-(local|prod)-\d{4}-\d{2}-\d{2}_\d{6}\.tar$/)

  await row.getByRole('button', { name: /Проверить|Check|检查/ }).click()
  await finished(page, job.id)
  await expect(row).toContainText(/в порядке|OK|正常/)

  // Restoring asks whether to save the current state first, ticked each time the dialog opens. Nothing is restored here
  await row.getByRole('button', { name: /Восстановить|Restore|恢复/ }).click()
  const safety = page.locator('#backup-restore-safety')
  await expect(safety).toBeChecked()
  await safety.uncheck()
  await expect(page.locator('#backup-restore-go')).toBeDisabled()
  await page.getByRole('button', { name: /Отмена|Cancel|取消/ }).click()
  await row.getByRole('button', { name: /Восстановить|Restore|恢复/ }).click()
  await expect(safety).toBeChecked()
  await page.getByRole('button', { name: /Отмена|Cancel|取消/ }).click()

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
  expect((await request.post('/api/v1/backups/job/0123456789ab/cancel')).status()).toBe(401)
  // A task's steps only for whoever knows its id
  const unknown = await request.get('/api/v1/backups/job/0123456789ab')
  expect(unknown.status()).toBe(404)
  expect(await unknown.json()).toEqual({ job: null })
})
