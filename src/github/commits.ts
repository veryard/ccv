import type { RestEndpointMethods } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types'
import { Commit } from './type'
import * as core from '@actions/core'
import {
  parser,
  toConventionalChangelogFormat
} from '@conventional-commits/parser'

export async function getCommits(
  rest: RestEndpointMethods,
  owner: string,
  repo: string,
  branch: string,
  latestTag: string
): Promise<Commit[]> {
  let currentPage = 0
  const commits: Commit[] = []

  while (true) {
    currentPage++
    const rawCommits = await rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${latestTag}...${branch}`,
      page: currentPage,
      per_page: 100
    })

    const totalCommits = rawCommits.data.total_commits || 0

    const rangeCommits = rawCommits.data.commits

    console.log(rangeCommits)

    // convert rangeCommits to commits
    commits.push(...rangeCommits)

    if (rangeCommits.length < 100 || commits.length >= totalCommits) {
      break
    }
  }

  if (!commits.length) {
    core.info('No commits found')
  }

  return commits as Commit[]
}

export async function parseCommits(
  commits: Commit[],
  prefix: string,
  latestTag: string
): Promise<[string[], string[], string[]]> {
  const breaking = []
  const features = []
  const fixes = []

  for (const commit of commits) {
    try {
      const cast = toConventionalChangelogFormat(parser(commit.commit.message))
      console.log(cast.type)
      switch (cast.type) {
        case 'breaking':
          breaking.push(commit.commit.message)
          break

        case 'feature':
          features.push(commit.commit.message)
          break

        case 'fix':
          fixes.push(commit.commit.message)
          break
      }

      for (const note of cast.notes) {
        if (note.title === 'BREAKING CHANGE') {
          breaking.push(commit.commit.message)
        }
      }
    } catch (err: any) {
      core.debug(err)
      core.warning(`Failed to parse commit: ${commit.commit.message}`)
    }
  }

  return [breaking, features, fixes]
}
