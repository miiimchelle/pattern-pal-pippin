import type {
  SelectedFrameScanResult,
  PatternGroup,
  TeamFileResult,
  LibraryMatch,
  RuleIssue,
} from '../hooks/usePluginMessages';

function severityIcon(severity: 'error' | 'warning' | 'info'): string {
  if (severity === 'error') return '!';
  if (severity === 'warning') return '?';
  return 'i';
}

function formatTeamFileResults(results: TeamFileResult[]): string {
  if (results.length === 0) return '';
  const lines: string[] = ['## Team File Matches', ''];
  for (const file of results) {
    lines.push(`### ${file.fileName} (${file.consistency}% consistency)`);
    lines.push('');
    lines.push('| Frame | Similarity |');
    lines.push('|-------|-----------|');
    for (const match of file.matches) {
      lines.push(`| ${match.teamFrameName} | ${match.similarity}% |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function formatLibraryMatches(matches: LibraryMatch[]): string {
  if (matches.length === 0) return '';
  const lines: string[] = ['## Library Matches', ''];
  lines.push('| Component | Similarity |');
  lines.push('|-----------|-----------|');
  for (const match of matches) {
    lines.push(`| ${match.componentName} | ${match.similarity}% |`);
  }
  lines.push('');
  return lines.join('\n');
}

function formatRuleIssues(issues: RuleIssue[]): string {
  if (issues.length === 0) return '';
  const lines: string[] = ['## Rule Violations', ''];
  lines.push('| Severity | Rule | Frame | Message |');
  lines.push('|----------|------|-------|---------|');
  for (const issue of issues) {
    lines.push(
      `| [${severityIcon(issue.severity)}] ${issue.severity} | ${issue.ruleName} | ${issue.frameName} | ${issue.message} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function exportFrameScanToMarkdown(result: SelectedFrameScanResult): string {
  const lines: string[] = [
    '# Pattern Pal - Frame Scan Report',
    '',
    `**Frame:** ${result.selectedFrame.name}`,
    `**Overall Consistency:** ${result.overallConsistency}%`,
    `**Date:** ${new Date().toLocaleDateString()}`,
    '',
  ];

  lines.push(formatTeamFileResults(result.teamFileResults));
  lines.push(formatLibraryMatches(result.libraryMatches));
  lines.push(formatRuleIssues(result.ruleIssues ?? []));

  return lines.join('\n').trim();
}

export function exportTeamScanToMarkdown(groups: PatternGroup[]): string {
  const lines: string[] = [
    '# Pattern Pal - Team Scan Report',
    '',
    `**Patterns Found:** ${groups.length}`,
    `**Date:** ${new Date().toLocaleDateString()}`,
    '',
  ];

  for (const group of groups) {
    const fileCount = new Set(group.frames.map((f) => f.fileKey || '__local__')).size;
    lines.push(`## Pattern: ${group.frames.length} frames, ${group.consistency}% consistent`);
    lines.push('');
    lines.push(`- **Dimensions:** ${group.frames[0].width}x${group.frames[0].height}px`);
    lines.push(`- **Files:** ${fileCount}`);
    lines.push('');

    lines.push('| Frame | File |');
    lines.push('|-------|------|');
    for (const frame of group.frames) {
      lines.push(`| ${frame.name} | ${frame.fileName || 'Local'} |`);
    }
    lines.push('');

    if (group.libraryMatches.length > 0) {
      lines.push(formatLibraryMatches(group.libraryMatches));
    }
  }

  return lines.join('\n').trim();
}
