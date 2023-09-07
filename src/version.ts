import { inc, clean } from 'semver'

export async function bumpVersion(
  breaking: number,
  features: number,
  fixes: number,
  version: string
): Promise<string> {
  let next = version

  if (breaking > 0) {
    inc(next, 'major')
  } else if (features > 0) {
    inc(next, 'minor')
  } else if (fixes > 0) {
    inc(next, 'patch')
  }

  return next
}
