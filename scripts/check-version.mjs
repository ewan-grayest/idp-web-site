import { execFileSync } from 'node:child_process'

export function versionIncreased(previous, next) {
  const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
  if (!semver.test(previous) || !semver.test(next)) return false
  const before = previous.split('.').map(Number), after = next.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (after[i] !== before[i]) return after[i] > before[i]
  return false
}

function gitFile(ref) { return JSON.parse(execFileSync('git', ['show', ref], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) }

export function checkStagedVersion() {
  const staged = gitFile(':package.json')
  const lock = gitFile(':package-lock.json')
  let previous
  try { previous = gitFile('HEAD:package.json').version } catch { /* first commit */ }
  if ((previous && !versionIncreased(previous, staged.version)) || lock.version !== staged.version || lock.packages?.['']?.version !== staged.version) {
    throw new Error('Increment the version before every commit: npm run version:patch (or version:minor / version:major), then stage package.json and package-lock.json.')
  }
  console.log(`Version check passed: ${previous || 'initial'} → ${staged.version}`)
}

if (process.argv.includes('--staged')) {
  try { checkStagedVersion() } catch (error) { console.error(error.message); process.exitCode = 1 }
}
