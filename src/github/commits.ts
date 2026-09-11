import type { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types';
import { Commit } from './type';
import * as core from '@actions/core';
import {
  parser,
  toConventionalChangelogFormat
} from '@conventional-commits/parser';

export async function getCommits(
  rest: RestEndpointMethods,
  owner: string,
  repo: string,
  branch: string,
  latestTag: string
): Promise<Commit[]> {
  let currentPage = 0;
  const commits: Commit[] = [];

  console.log(`Comparing ${latestTag}...${branch}`);
  while (true) {
    currentPage++;
    const rawCommits = await rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${latestTag}...${branch}`,
      page: currentPage,
      per_page: 100
    });

    const totalCommits = rawCommits.data.total_commits || 0;
    const rangeCommits = rawCommits.data.commits;

    commits.push(...rangeCommits);

    if (rangeCommits.length < 100 || commits.length >= totalCommits) {
      break;
    }
  }

  if (!commits.length) {
    core.info('No commits found');
  }

  return commits as Commit[];
}

export async function parseCommits(
  commits: Commit[],
  options?: { scanBody?: boolean }
): Promise<[Commit[], Commit[], Commit[], Commit[]]> {
  const scanBody = options?.scanBody ?? true;
  const breaking: Commit[] = [];
  const features: Commit[] = [];
  const fixes: Commit[] = [];
  const changes: Commit[] = [];

  for (const commit of commits) {
    const message = commit.commit.message || '';
    const headline = message.split('\n')[0] || '';

    let headlineType: string | null = null;
    let headlineBreaking = false;
    let parsed = false;

    try {
      const cast = toConventionalChangelogFormat(parser(message));
      parsed = true;
      headlineType = (cast.type || '').toLowerCase();
      const notes = cast.notes || [];
      for (const note of notes) {
        if ((note.title || '').toUpperCase() === 'BREAKING CHANGE') {
          headlineBreaking = true;
          break;
        }
      }
      if (/^[\w-]+(\([^)]*\))?!:/.test(headline.trim())) {
        headlineBreaking = true;
      }
    } catch (err: any) {
      core.debug(`Unparsable headline, falling back to body scan: ${headline}`);
      if (/^[\w-]+(\([^)]*\))?!:/.test(headline.trim())) {
        headlineBreaking = true;
      }
    }

    const isBreakingType =
      headlineType === 'breaking' ||
      headlineType === 'break' ||
      headlineType === 'major';
    const isFeatType =
      headlineType === 'feat' || headlineType === 'feature';
    const isFixType =
      headlineType === 'fix' ||
      headlineType === 'perf' ||
      headlineType === 'revert';

    let bodyHasBreaking = false;
    let bodyHasFeat = false;
    let bodyHasFix = false;
    if (scanBody) {
      const found = scanBodyForConventional(message);
      bodyHasBreaking = found.breaking;
      bodyHasFeat = found.feat;
      bodyHasFix = found.fix;
    }

    const breakingHit =
      headlineBreaking || isBreakingType || bodyHasBreaking;
    const featHit =
      !breakingHit && (isFeatType || bodyHasFeat);
    const fixHit =
      !breakingHit && !featHit && (isFixType || bodyHasFix);

    if (breakingHit) {
      breaking.push(commit);
    } else if (featHit) {
      features.push(commit);
    } else if (fixHit) {
      fixes.push(commit);
    } else {
      if (!parsed) {
        core.debug(
          `Non-conventional commit kept as change: ${headline}`
        );
      }
      changes.push(commit);
    }
  }

  return [breaking, features, fixes, changes];
}

export function scanBodyForConventional(message: string): {
  breaking: boolean;
  feat: boolean;
  fix: boolean;
} {
  const lines = message.split('\n');
  let breaking = false;
  let feat = false;
  let fix = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const stripped = line.replace(/^([-*]|\d+[.)])\s+/, '');
    const match = stripped.match(
      /^(breaking|break|major|feat|feature|fix|perf|revert)(\([^)]*\))?(!)?\s*:/i
    );
    if (!match) continue;
    const type = match[1].toLowerCase();
    const bang = Boolean(match[3]);
    if (bang || type === 'breaking' || type === 'break' || type === 'major') {
      breaking = true;
    } else if (type === 'feat' || type === 'feature') {
      feat = true;
    } else if (type === 'fix' || type === 'perf' || type === 'revert') {
      fix = true;
    }
    if (/^BREAKING[ -]CHANGE\s*:/i.test(stripped)) {
      breaking = true;
    }
  }

  if (/^BREAKING[ -]CHANGE\s*:/im.test(message)) {
    breaking = true;
  }

  return { breaking, feat, fix };
}
