/**
 * Unit tests for src/github/commits.ts
 */

import { getCommits, parseCommits } from '../src/github/commits';
import * as github from '@actions/github';

const token = process.env.GITHUB_TOKEN;

describe('getCommits', () => {
  it('has commits', async () => {
    if (!token) {
      return;
    }

    const octokit = github.getOctokit(token);
    const commits = await getCommits(octokit.rest, 'modlr-the-corporate-performance-cloud', 'thin', 'master', 'v1.10.1');

    console.log(commits);
    expect(commits).toBeTruthy();
  });
});
