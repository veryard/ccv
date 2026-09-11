/**
 * Unit tests for the eb7503b promotion-commit fix + parser hardening.
 * No network access; pure local fixtures.
 */

import { parseCommits, scanBodyForConventional } from '../src/github/commits';
import { bumpVersion } from '../src/version';
import type { Commit } from '../src/github/type';

function mockCommit(message: string, sha = 'abc1234'): Commit {
  return {
    sha,
    commit: {
      message,
      url: `https://api.github.com/repos/o/r/git/commits/${sha}`
    }
  } as unknown as Commit;
}

describe('scanBodyForConventional', () => {
  it('finds feat/fix bullets in a promotion body', () => {
    const found = scanBodyForConventional(
      'API: Staging -> Main (#562)\n\n* feat(monitor): Alerts\n* fix(notify): Server IP\n'
    );
    expect(found.feat).toBe(true);
    expect(found.fix).toBe(true);
    expect(found.breaking).toBe(false);
  });

  it('detects breaking markers', () => {
    expect(
      scanBodyForConventional('feat!: drop node\n').breaking
    ).toBe(true);
    expect(
      scanBodyForConventional('* feat(api)!: change\n').breaking
    ).toBe(true);
    expect(
      scanBodyForConventional('fix: x\n\nBREAKING CHANGE: drop y\n').breaking
    ).toBe(true);
  });
});

describe('parseCommits', () => {
  it('bumps minor for the eb7503b promotion commit (feat in body)', async () => {
    const msg =
      'API: Staging -> Main (#562)\n\n* feat(monitor): Alerts\n\n* fix(notify): Server IP\n\n* feat(integrations): New endpoints\n\n* fix: Validate Client Server skip ip on de\n\n* feat(auth): idempotent refresh tokens (#560)';
    const [breaking, features, fixes, changes] = await parseCommits([
      mockCommit(msg, 'eb7503b')
    ]);
    // One commit object lands in the highest bucket it qualifies for.
    expect(breaking.length).toBe(0);
    expect(features.length).toBe(1);
    expect(fixes.length).toBe(0);
    expect(changes.length).toBe(0);

    const next = await bumpVersion(
      breaking.length,
      features.length,
      fixes.length,
      '0.46.3',
      'all'
    );
    expect(next).toBe('0.47.0');
  });

  it('is case-insensitive (Feat/FIX)', async () => {
    const [breaking, features, fixes, changes] = await parseCommits([
      mockCommit('Feat(auth): x'),
      mockCommit('FIX: y')
    ]);
    expect(features.length).toBe(1);
    expect(fixes.length).toBe(1);
    expect(changes.length).toBe(0);
    expect(breaking.length).toBe(0);
  });

  it('maps perf/revert to patch', async () => {
    const [breaking, features, fixes, changes] = await parseCommits([
      mockCommit('perf: faster'),
      mockCommit('revert: backout')
    ]);
    expect(fixes.length).toBe(2);
    expect(changes.length).toBe(0);
    expect(breaking.length).toBe(0);
    const next = await bumpVersion(0, 0, fixes.length, '1.2.3', 'all');
    expect(next).toBe('1.2.4');
  });

  it('puts feat!: in breaking only (no duplicate)', async () => {
    const [breaking, features, fixes] = await parseCommits([
      mockCommit('feat!: drop node 16')
    ]);
    expect(breaking.length).toBe(1);
    expect(features.length).toBe(0);
    expect(fixes.length).toBe(0);
  });

  it('keeps merge commits as changes instead of dropping them', async () => {
    const [, , , changes] = await parseCommits([
      mockCommit('Merge pull request #562 from staging')
    ]);
    expect(changes.length).toBe(1);
  });

  it('respects scanBody=false', async () => {
    const [breaking, features, fixes, changes] = await parseCommits(
      [mockCommit('API: Staging -> Main (#562)\n\n* feat(monitor): Alerts\n')],
      { scanBody: false }
    );
    expect(features.length).toBe(0);
    expect(changes.length).toBe(1);
    expect(breaking.length).toBe(0);
    expect(fixes.length).toBe(0);
  });
});

describe('bumpVersion unknown_bump', () => {
  it('does not bump on pure chores by default', async () => {
    const next = await bumpVersion(0, 0, 0, '0.46.3', 'all', {
      changes: 2,
      unknownBump: 'none'
    });
    expect(next).toBe('0.46.3');
  });

  it('bumps patch when unknown_bump=patch', async () => {
    const next = await bumpVersion(0, 0, 0, '0.46.3', 'all', {
      changes: 2,
      unknownBump: 'patch'
    });
    expect(next).toBe('0.46.4');
  });
});
