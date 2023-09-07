import * as core from '@actions/core'
import * as github from '@actions/github'
import { getLatestVersion } from './github/tags'
import { getCommits, parseCommits } from './github/commits'
import { Commit } from './github/type'
import { bumpVersion } from './version'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const token = core.getInput('token')
  const branch = core.getInput('branch')
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo
  const prefix = core.getInput('prefix') || ''

  let latestTag: string
  try {
    latestTag = await getLatestVersion(octokit, owner, repo, prefix)
    core.info(`Latest tag: ${latestTag}`)
  } catch (err: any) {
    return core.setFailed(err.message)
  }

  core.exportVariable('current', `${prefix}${latestTag}`)
  core.setOutput('current', `${prefix}${latestTag}`)

  let commits: Commit[]
  try {
    commits = await getCommits(
      octokit.rest,
      owner,
      repo,
      branch,
      `${prefix}${latestTag}`
    )
  } catch (err: any) {
    core.debug(err)
    return core.setFailed(err.message)
  }

  const [breaking, features, fixes] = await parseCommits(commits)

  core.debug(`Breaking changes count: ${breaking.length}`)
  core.debug(`Features count: ${features.length}`)
  core.debug(`Fixes count: ${fixes.length}`)

  let newVersion = await bumpVersion(
    breaking.length,
    features.length,
    fixes.length,
    latestTag
  )

  core.info(`New version: ${newVersion}`)
  core.exportVariable('new', `${prefix}${newVersion}`)
  core.setOutput('new', `${prefix}${newVersion}`)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
