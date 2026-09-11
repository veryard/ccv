import type { Octokit } from '@octokit/core';
import { valid, rsort } from 'semver';
import { GraphQLRepositoryResponse } from './type';

export async function getLatestVersion(
  octokit: Octokit,
  owner: string,
  repo: string,
  prefix: string
): Promise<string> {
  const tags = await octokit.graphql<GraphQLRepositoryResponse>(
    `
    query lastTags ($owner: String!, $repo: String!) {
      repository (owner: $owner, name: $repo) {
        refs(first: 100, refPrefix: "refs/tags/", orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
          nodes {
            name
            target {
              oid
            }
          }
        }
      }
    }
    `,
    {
      owner,
      repo
    }
  );

  const list = tags.repository.refs.nodes;
  if (list.length < 1) {
    throw new Error('No tags found, please create one (e.g. v1.0.0)');
  }

  const candidates: string[] = [];
  for (const tag of list) {
    const raw = tag.name;
    let clean: string;
    if (prefix) {
      if (!raw.startsWith(prefix)) {
        continue;
      }
      clean = raw.slice(prefix.length);
    } else {
      clean = raw;
    }

    if (valid(clean)) {
      candidates.push(clean);
    }
  }

  if (candidates.length < 1) {
    throw new Error('No valid tags found, please create one (e.g. v1.0.0)');
  }

  return rsort(candidates)[0];
}
