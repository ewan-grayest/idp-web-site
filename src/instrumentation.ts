/**
 * Runs once when the server starts (next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md).
 * Keeps the latest log lines in memory for the admin's «Диагностика» page, see src/lib/logBuffer.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { captureConsole } = await import('./lib/logBuffer')
  captureConsole()
}
