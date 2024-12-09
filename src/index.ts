import * as core from '@actions/core';
import * as github from '@actions/github';
import { getLatestVersion } from './github/tags';
import { getCommits, parseCommits } from './github/commits';
import { Commit } from './github/type';
import { bumpVersion } from './version';
import { formatChangelog, generateChangelog } from './changlog';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const token = core.getInput('token');
  const branch = core.getInput('branch');
  const octokit = github.getOctokit(token);
  const incrementType = core.getInput('increment') || 'all';
  const { owner, repo } = github.context.repo;
  const prefix = core.getInput('prefix') || '';

  let latestTag: string;
  try {
    latestTag = await getLatestVersion(octokit, owner, repo, prefix);
    core.info(`Latest tag: ${latestTag}`);
  } catch (err: any) {
    return core.setFailed(err.message);
  }

  core.exportVariable('old', `${prefix}${latestTag}`);
  core.setOutput('old', `${prefix}${latestTag}`);

  core.exportVariable('old_clean', latestTag);
  core.setOutput('old_clean', latestTag);

  let commits: Commit[];
  try {
    commits = await getCommits(
      octokit.rest,
      owner,
      repo,
      branch,
      `${prefix}${latestTag}`
    );
  } catch (err: any) {
    core.debug(err);
    return core.setFailed(err.message);
  }

  const [breaking, features, fixes, changes] = await parseCommits(commits);

  core.debug(`Breaking changes count: ${breaking.length}`);
  core.debug(`Features count: ${features.length}`);
  core.debug(`Fixes count: ${fixes.length}`);
  core.debug(`Other changes count: ${changes.length}`);

  let newVersion = await bumpVersion(
    breaking.length,
    features.length,
    fixes.length,
    latestTag,
    incrementType
  );

  core.info(`New version: ${newVersion}`);
  core.exportVariable('new', `${prefix}${newVersion}`);
  core.setOutput('new', `${prefix}${newVersion}`);

  core.info(`Clean new version: ${newVersion}`);
  core.exportVariable('new_clean', `${newVersion}`);
  core.setOutput('new_clean', `${newVersion}`);

  // Build changelogs
  let changelog = await generateChangelog(
    breaking,
    features,
    fixes,
    changes,
    newVersion,
    prefix,
    owner,
    repo
  );


  const changelogsClean = formatChangelog(changelog, "plain");
  core.setOutput('changelogs_clean', changelogsClean);
  core.exportVariable('changelogs_clean', changelogsClean);

  const changelogs = formatChangelog(changelog, "markdown");
  core.setOutput('changelogs', changelogs);
  core.exportVariable('changelogs', changelogs);

  const bbcode = formatChangelog(changelog, "bbcode");
  core.setOutput('changelogs_bbcode', bbcode);
  core.exportVariable('changelogs_bbcode', bbcode);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();
