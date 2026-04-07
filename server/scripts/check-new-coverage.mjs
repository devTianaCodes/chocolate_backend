import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const backendRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const coveragePath = path.join(backendRoot, 'coverage', 'coverage-final.json');

function parseArgs(argv) {
  const args = { threshold: 90, base: process.env.COVERAGE_BASE || '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base') args.base = argv[i + 1] || '';
    if (arg === '--threshold') args.threshold = Number(argv[i + 1] || 90);
  }
  return args;
}

function runGitDiff(base) {
  if (!base) {
    throw new Error('Missing base ref. Pass --base <sha> or set COVERAGE_BASE.');
  }

  const currentHead = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();

  if (base === 'HEAD' || base === currentHead) {
    return '';
  }

  return execFileSync(
    'git',
    ['diff', '--unified=0', '--no-color', `${base}...HEAD`, '--', 'server/src'],
    { cwd: repoRoot, encoding: 'utf8' }
  );
}

function parseChangedLines(diffText) {
  const changed = new Map();
  let currentFile = null;

  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ b/')) {
      const filePath = line.slice('+++ b/'.length).trim();
      currentFile = filePath.endsWith('.js') ? path.resolve(repoRoot, filePath) : null;
      continue;
    }

    if (!currentFile || !line.startsWith('@@')) continue;

    const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!match) continue;

    const start = Number(match[1]);
    const count = Number(match[2] || '1');
    if (count === 0) continue;

    if (!changed.has(currentFile)) changed.set(currentFile, new Set());
    const fileLines = changed.get(currentFile);
    for (let offset = 0; offset < count; offset += 1) {
      fileLines.add(start + offset);
    }
  }

  return changed;
}

function statementCoversLine(statement, lineNumber) {
  const start = statement.start.line;
  const end = statement.end.line;
  return lineNumber >= start && lineNumber <= end;
}

function computeChangedCoverage(changedLines, coverage) {
  let covered = 0;
  let total = 0;

  for (const [filePath, lineSet] of changedLines.entries()) {
    const fileCoverage = coverage[filePath];
    if (!fileCoverage) {
      total += lineSet.size;
      continue;
    }

    for (const lineNumber of lineSet) {
      total += 1;
      const isCovered = Object.entries(fileCoverage.statementMap).some(([statementId, statement]) => (
        statementCoversLine(statement, lineNumber) && Number(fileCoverage.s[statementId] || 0) > 0
      ));
      if (isCovered) covered += 1;
    }
  }

  return { covered, total, percent: total === 0 ? 100 : (covered / total) * 100 };
}

function main() {
  const { base, threshold } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(coveragePath)) {
    throw new Error(`Coverage file not found at ${coveragePath}. Run npm run test:coverage first.`);
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const diffText = runGitDiff(base);
  const changedLines = parseChangedLines(diffText);
  const result = computeChangedCoverage(changedLines, coverage);

  const summary = `Changed backend line coverage: ${result.percent.toFixed(2)}% (${result.covered}/${result.total})`;
  console.log(summary);

  if (result.percent < threshold) {
    throw new Error(`Changed backend coverage ${result.percent.toFixed(2)}% is below the ${threshold}% target.`);
  }
}

main();
