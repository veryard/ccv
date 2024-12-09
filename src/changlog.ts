import { Commit } from './github/type';

interface ChangelogCommit {
  message: string;
  sha: string;
  url: string;
  scope?: string;
}

interface ChangelogData {
  title: string;
  repo: string;
  version: string;
  prefix: string;
  breaking: ChangelogCommit[];
  features: ChangelogCommit[];
  fixes: ChangelogCommit[];
  changes: ChangelogCommit[];
}

export async function generateChangelog(
  breaking: Commit[],
  features: Commit[],
  fixes: Commit[],
  changes: Commit[],
  version: string,
  prefix: string,
  owner: string,
  repo: string
): Promise<ChangelogData> {
  const repoUrl = `https://github.com/${owner}/${repo}`;

  return {
    title: `${repo} Changelogs ${prefix}${version}`,
    repo,
    version,
    prefix,
    breaking: breaking.map(c => parseCommit(c, repoUrl)),
    features: features.map(c => parseCommit(c, repoUrl)),
    fixes: fixes.map(c => parseCommit(c, repoUrl)),
    changes: changes.map(c => parseCommit(c, repoUrl))
  };
}

function parseCommit(commit: Commit, repoUrl: string): ChangelogCommit {
  const sha = decodeURIComponent(commit.sha);
  const message = decodeURIComponent(commit.commit.message);
  const url = `${repoUrl}/commit/${sha}`;

  const parts = message.split(':', 2);
  if (parts.length === 2) {
    const scope = parts[0].trim();
    const start = scope.indexOf('(');
    const end = scope.indexOf(')');
    if (start !== -1 && end !== -1) {
      return {
        message: parts[1].trim(),
        sha: sha.substring(0, 7),
        url,
        scope: scope.substring(start + 1, end)
      };
    }
  }

  return {
    message: message.trim(),
    sha: sha.substring(0, 7),
    url
  };
}

export function formatChangelog(data: ChangelogData, type: "markdown" | "bbcode" | "plain"): string {
  const formatters = {
    markdown: {
      title: (text: string) => `## ${text}`,
      section: (text: string) => `### ${text}`,
      scope: (text: string) => `**${text}**`,
      link: (text: string, url: string) => `[${text}](${url})`
    },
    bbcode: {
      title: (text: string) => `[b]${text}[/b]`,
      section: (text: string) => `[b]${text}[/b]`,
      scope: (text: string) => `[b]${text}[/b]`,
      link: (text: string, url: string) => `[url=${url}]${text}[/url]`
    },
    plain: {
      title: (text: string) => text,
      section: (text: string) => text,
      scope: (text: string) => text,
      link: (text: string, url: string) => `${text} (${url})`
    }
  };

  const fmt = formatters[type];
  const builder: string[] = [];

  function formatCommits(commits: ChangelogCommit[]) {
    return commits.map(commit => {
      const scopeText = commit.scope ? `${fmt.scope(commit.scope)}: ` : '';
      const link = fmt.link(commit.sha, commit.url);
      return `- ${scopeText}${commit.message} (${link})\n`;
    }).join('');
  }

  builder.push(`${fmt.title(data.title)}\n\n`);

  if (data.breaking.length > 0) {
    builder.push(`${fmt.section('Breaking Changes')}\n\n${formatCommits(data.breaking)}\n`);
  }

  if (data.features.length > 0) {
    builder.push(`${fmt.section('Features')}\n\n${formatCommits(data.features)}\n`);
  }

  if (data.fixes.length > 0) {
    builder.push(`${fmt.section('Fixes')}\n\n${formatCommits(data.fixes)}\n`);
  }

  if (data.changes.length > 0) {
    builder.push(`${fmt.section('Other Changes')}\n\n${formatCommits(data.changes)}\n`);
  }

  return builder.join('');
}
