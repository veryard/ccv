/**
 * Unit tests for src/version.ts
 */

import * as github from '@actions/github';
import { getLatestVersion } from '../src/github/tags';
const token = process.env.GITHUB_TOKEN;

describe('getLatestVersion', () => {
  it('is latest', async () => {
    if (!token) {
      return;
    }

    const octokit = github.getOctokit(token);
    const version = await getLatestVersion(octokit, 'modlr-the-corporate-performance-cloud', 'thin', 'v');

    console.log(version);
  });
});
