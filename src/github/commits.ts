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
  commits: Commit[]
): Promise<[Commit[], Commit[], Commit[], Commit[]]> {
  const breaking: Commit[] = [];
  const features: Commit[] = [];
  const fixes: Commit[] = [];
  const changes: Commit[] = [];

  for (const commit of commits) {
    try {
      const cast = toConventionalChangelogFormat(parser(commit.commit.message));
      switch (cast.type) {
        case 'breaking':
        case 'break':
        case 'major':
          breaking.push(commit);
          break;

        case 'feat':
        case 'feature':
          features.push(commit);
          break;

        case 'fix':
          fixes.push(commit);
          break;

        default:
          changes.push(commit);
          break;
      }

      for (const note of cast.notes) {
        if (note.title === 'BREAKING CHANGE') {
          breaking.push(commit);
        }
      }
    } catch (err: any) {
      core.debug(err);
      core.warning(
        `Failed to parse commit: (${commit.commit.url}) ${commit.commit.message}`
      );
    }
  }

  return [breaking, features, fixes, changes];
}
