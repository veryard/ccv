import { inc } from 'semver'
import * as core from '@actions/core'

export async function bumpVersion(
  breaking: number,
  features: number,
  fixes: number,
  version: string
): Promise<string> {
  let next: string | null = version
  if (breaking > 0) {
    next = inc(next, 'major')
  } else if (features > 0) {
    next = inc(next, 'minor')
  } else if (fixes > 0) {
    next = inc(next, 'patch')
  }

  if (next == null) {
    core.info('No new version')
  }

  return next!
}
