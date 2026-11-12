import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Fonts must be free and as in the spec (Ewan, 2026-11-11): Roboto only, under a free licence.
// tests/e2e/fonts.spec.ts checks that pages render in it.
const root = path.resolve(__dirname, '../..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string>; devDependencies?: Record<string, string> }
const fontPackages = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) => name.startsWith('@fontsource'))
// Licences that allow commercial use and serving the files from our own site
const FREE = ['OFL-1.1', 'Apache-2.0']

describe('fonts', () => {
  it('ships Roboto only', () => {
    expect(fontPackages).toEqual(['@fontsource-variable/roboto'])
  })

  it.each(fontPackages)('%s has a free licence', (name) => {
    const meta = JSON.parse(read(`node_modules/${name}/package.json`)) as { license: string }
    expect(FREE).toContain(meta.license)
  })
})
