import { execFileSync } from 'node:child_process'
import { versionIncreased } from './check-version.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const head = process.env.HEAD || 'HEAD'
const base = process.env.BASE
// On the first remote push, historical local commits predate this policy. Check the introduced tip.
const commits = !base || /^0+$/.test(base) ? [git('rev-parse', head)] : git('rev-list', '--reverse', `${base}..${head}`).split('\n').filter(Boolean)
for (const commit of commits) {
  const data = JSON.parse(git('show', `${commit}:package.json`))
  const lock = JSON.parse(git('show', `${commit}:package-lock.json`))
  if (data.version !== lock.version || data.version !== lock.packages?.['']?.version) throw new Error(`${commit}: package versions differ`)
  const parents = git('rev-list', '--parents', '-n', '1', commit).split(' ').slice(1)
  // Compare with the first parent, including merge commits.
  if (parents.length) {
    const previous = JSON.parse(git('show', `${parents[0]}:package.json`)).version
    if (!versionIncreased(previous, data.version)) throw new Error(`${commit}: increment ${previous} before committing`)
  }
  console.log(`${commit.slice(0, 7)} · ${data.version}`)
}
