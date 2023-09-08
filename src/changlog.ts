import { Commit } from './github/type'

export async function generateChangelog(
  breaking: Commit[],
  features: Commit[],
  fixes: Commit[],
  changes: Commit[],
  version: string,
  prefix: string,
  owner: string,
  repo: string
): Promise<string> {
  const builder: string[] = []

  const repoUrl = `https://github.com/${owner}/${repo}`

  builder.push('## ')
  builder.push(repo)
  builder.push(' Changelogs ')
  builder.push(prefix)
  builder.push(version)
  builder.push('\n\n')

  if (breaking.length > 0) {
    builder.push('### Breaking Changes\n\n')
    for (const commit of breaking) {
      builder.push(formatCommit(commit, repoUrl))
    }
    builder.push('\n')
  }

  if (features.length > 0) {
    builder.push('### Features\n\n')
    for (const commit of features) {
      builder.push(formatCommit(commit, repoUrl))
    }
    builder.push('\n')
  }

  if (fixes.length > 0) {
    builder.push('### Fixes\n\n')
    for (const commit of fixes) {
      builder.push(formatCommit(commit, repoUrl))
    }
    builder.push('\n')
  }

  if (changes.length > 0) {
    builder.push('### Other Changes\n\n')
    for (const commit of changes) {
      builder.push(formatCommit(commit, repoUrl))
    }
    builder.push('\n')
  }

  return builder.join('')
}

function formatCommit(commit: Commit, repoUrl: string) {
  const sha = decodeURIComponent(commit.sha)
  const shortSHA = sha.substring(0, 7)
  const commitURL = `${repoUrl}/commit/${sha}`
  let message = decodeURIComponent(commit.commit.message)

  const parts = message.split(':', 2)
  if (parts.length === 2) {
    parts[0] = parts[0].trim()
    const start = parts[0].indexOf('(')
    const end = parts[0].indexOf(')')
    if (start !== -1 && end !== -1) {
      parts[0] = `**${parts[0].substring(start + 1, end)}**: `
    } else {
      parts[0] = ''
    }
    message = parts[0] + parts[1].trim()
  }

  return `- ${message} ([${shortSHA}](${commitURL}))\n`
}
