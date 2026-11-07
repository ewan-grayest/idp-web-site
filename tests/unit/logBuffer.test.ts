import { describe, expect, it } from 'vitest'

import { addLog, pinoLevel, pinoText, recentLogs, redact, secretValues } from '@/lib/logBuffer'

describe('log buffer', () => {
  it('hides the secret, the database password and any password in an address', () => {
    const env = { PAYLOAD_SECRET: 'super-secret-value', DATABASE_URI: 'postgres://idp:p%40ss-word@db/idp' } as unknown as NodeJS.ProcessEnv
    const secrets = secretValues(env)
    expect(redact('secret super-secret-value here', secrets)).toBe('secret *** here')
    expect(redact('password p@ss-word failed', secrets)).toBe('password *** failed')
    expect(redact('connect postgres://other:hunter22@host:5432/x', secrets)).toBe('connect postgres://other:***@host:5432/x')
  })

  it('keeps lines in order and redacts them', () => {
    process.env.PAYLOAD_SECRET = 'kept-out-of-the-log'
    addLog('error', 'console', 'boom kept-out-of-the-log')
    const last = recentLogs().at(-1)
    expect(last).toMatchObject({ level: 'error', source: 'console', text: 'boom ***' })
  })

  it('keeps at most 500 lines', () => {
    for (let i = 0; i < 600; i++) addLog('info', 'console', `line ${i}`)
    const logs = recentLogs()
    expect(logs).toHaveLength(500)
    expect(logs.at(-1)?.text).toBe('line 599')
  })

  it('reads Pino calls', () => {
    expect(pinoLevel(50)).toBe('error')
    expect(pinoLevel(40)).toBe('warn')
    expect(pinoLevel(30)).toBe('info')
    expect(pinoText(['plain %s', 'text'])).toBe('plain text')
    expect(pinoText([{ msg: 'Saved', id: 3 }])).toBe('Saved\n{"id":3}')
    const err = new Error('broken')
    expect(pinoText([{ err, msg: 'Failed' }])).toContain('Failed\nError: broken')
    expect(pinoText([err, 'While saving'])).toMatch(/^While saving\nError: broken/)
  })
})
