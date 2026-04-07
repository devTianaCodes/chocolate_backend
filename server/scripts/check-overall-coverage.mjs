import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const coveragePath = path.join(backendRoot, 'coverage', 'coverage-final.json');

function parseArgs(argv) {
  const args = { threshold: 80 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--threshold') args.threshold = Number(argv[i + 1] || 80);
  }
  return args;
}

function statementCoversLine(statement, lineNumber) {
  return lineNumber >= statement.start.line && lineNumber <= statement.end.line;
}

function computeMetrics(coverage) {
  let coveredStatements = 0;
  let totalStatements = 0;
  let coveredFunctions = 0;
  let totalFunctions = 0;
  let coveredLines = 0;
  let totalLines = 0;

  for (const [filePath, info] of Object.entries(coverage)) {
    if (!filePath.includes(`${path.sep}src${path.sep}`)) continue;

    totalStatements += Object.keys(info.s).length;
    coveredStatements += Object.values(info.s).filter((count) => Number(count) > 0).length;

    totalFunctions += Object.keys(info.f).length;
    coveredFunctions += Object.values(info.f).filter((count) => Number(count) > 0).length;

    const relevantLines = new Set();
    const coveredLineSet = new Set();

    for (const [statementId, statement] of Object.entries(info.statementMap)) {
      for (let line = statement.start.line; line <= statement.end.line; line += 1) {
        relevantLines.add(line);
        if (Number(info.s[statementId] || 0) > 0 && statementCoversLine(statement, line)) {
          coveredLineSet.add(line);
        }
      }
    }

    totalLines += relevantLines.size;
    coveredLines += coveredLineSet.size;
  }

  return {
    statements: totalStatements === 0 ? 100 : (coveredStatements / totalStatements) * 100,
    functions: totalFunctions === 0 ? 100 : (coveredFunctions / totalFunctions) * 100,
    lines: totalLines === 0 ? 100 : (coveredLines / totalLines) * 100,
  };
}

function main() {
  const { threshold } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(coveragePath)) {
    throw new Error(`Coverage file not found at ${coveragePath}. Run npm run test:coverage first.`);
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const metrics = computeMetrics(coverage);

  console.log(
    `Backend source coverage: statements ${metrics.statements.toFixed(2)}%, lines ${metrics.lines.toFixed(2)}%, functions ${metrics.functions.toFixed(2)}%`
  );

  const failures = Object.entries(metrics)
    .filter(([, value]) => value < threshold)
    .map(([metric, value]) => `${metric} ${value.toFixed(2)}%`);

  if (failures.length > 0) {
    throw new Error(`Backend source coverage below ${threshold}%: ${failures.join(', ')}`);
  }
}

main();
