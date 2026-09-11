import { inc } from 'semver';
import * as core from '@actions/core';

export async function bumpVersion(
  breaking: number,
  features: number,
  fixes: number,
  version: string,
  incrementType: string,
  options?: { changes?: number; unknownBump?: string }
): Promise<string> {
  const changes = options?.changes ?? 0;
  const unknownBump = (options?.unknownBump ?? 'none').toLowerCase();
  let next: string | null = version;

  switch (incrementType) {
    case 'all':
      if (breaking > 0) {
        next = inc(next, 'major');
      } else if (features > 0) {
        next = inc(next, 'minor');
      } else if (fixes > 0) {
        next = inc(next, 'patch');
      } else if (changes > 0) {
        next = bumpUnknown(next, unknownBump);
      }
      break;
    case 'breaking':
      if (breaking > 0) {
        next = inc(next, 'major');
      } else if (features > 0) {
        next = inc(next, 'major');
      } else if (fixes > 0) {
        next = inc(next, 'major');
      }
      break;
    case 'feat':
      if (breaking > 0) {
        next = inc(next, 'minor');
      } else if (features > 0) {
        next = inc(next, 'minor');
      } else if (fixes > 0) {
        next = inc(next, 'minor');
      }
      break;
    case 'fix':
      if (breaking > 0) {
        next = inc(next, 'patch');
      } else if (features > 0) {
        next = inc(next, 'patch');
      } else if (fixes > 0) {
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

function bumpUnknown(
  version: string,
  unknownBump: string
): string | null {
  switch (unknownBump) {
    case 'major':
      return inc(version, 'major');
    case 'minor':
      return inc(version, 'minor');
    case 'patch':
      return inc(version, 'patch');
    case 'none':
    default:
      return version;
  }
}
