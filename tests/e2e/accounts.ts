// Admin accounts for the tests. E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD, or created on an empty database.
export const adminEmail = process.env.E2E_ADMIN_EMAIL || 'test@example.ru'
export const password = process.env.E2E_ADMIN_PASSWORD || 'Test12345!'

/** Each device project signs in as its own user (made by global-setup.ts from the admin above). */
export const accountFor = (project: string) => `e2e-${project}@example.ru`
