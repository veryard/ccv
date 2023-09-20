import type { Octokit } from '@octokit/core';
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
        refs(first: 20, refPrefix: "refs/tags/", orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
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

  let latestTag;
  for (const tag of list) {
    if (prefix) {
      tag.name = tag.name.startsWith(prefix)
        ? tag.name.replace(prefix, '')
        : tag.name;
    }

    // TODO: Check if valid semver?

    latestTag = tag;
    break;
  }

  if (!latestTag) {
    throw new Error('No valid tags found, please create one (e.g. v1.0.0)');
  }

  return latestTag.name;
}
