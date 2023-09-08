import { inc } from 'semver';
import * as core from '@actions/core';

export async function bumpVersion(
  breaking: number,
  features: number,
  fixes: number,
  version: string,
  incrementType: string
): Promise<string> {
  let next: string | null = version;

  switch (incrementType) {
    case 'all':
      if (breaking > 0) {
        next = inc(next, 'major');
      } else if (features > 0) {
        next = inc(next, 'minor');
      } else if (fixes > 0) {
        next = inc(next, 'patch');
      }
      break;
    case 'breaking':
      if (breaking > 0) {
        next = inc(next, 'major');
      }
      break;
    case 'feat':
      if (features > 0) {
        next = inc(next, 'minor');
      }
      break;
    case 'fix':
      if (fixes > 0) {
        next = inc(next, 'patch');
      }
      break;
  }

  if (next === null) {
    core.info('No new version');
    return version;
  }

  return next;
}
