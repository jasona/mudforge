#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { resolve, relative } from 'path';

const ROOTS = ['src', 'mudlib'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.juggle']);

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name) || name.startsWith('test-mudlib-');
}

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      await walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function countMatches(content, re) {
  const matches = content.match(re);
  return matches ? matches.length : 0;
}

export async function analyzeCodeMetrics(repoRoot = process.cwd()) {
  const roots = ROOTS.map((r) => resolve(repoRoot, r));
  const files = [];
  for (const root of roots) {
    files.push(...(await walk(root)));
  }

  let anyCount = 0;
  let asAnyCount = 0;
  let functionTypeCount = 0;
  let asCount = 0;
  let nonNullCount = 0;
  const fileLineCounts = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const rel = relative(repoRoot, file).replaceAll('\\', '/');
    const lineCount = content.split('\n').length;

    fileLineCounts.push({ file: rel, lines: lineCount });
    anyCount += countMatches(content, /\bany\b/g);
    asAnyCount += countMatches(content, /\sas\s+any\b/g);
    functionTypeCount += countMatches(content, /\bFunction\b/g);
    asCount += countMatches(content, /\sas\s/g);
    nonNullCount += countMatches(content, /\w+!\./g);
    nonNullCount += countMatches(content, /\w+!\[/g);
    nonNullCount += countMatches(content, /\w+!\)/g);
    nonNullCount += countMatches(content, /\w+!,/g);
    nonNullCount += countMatches(content, /\w+!;/g);
  }

  fileLineCounts.sort((a, b) => b.lines - a.lines);

  return {
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    anyCount,
    asAnyCount,
    functionTypeCount,
    asCount,
    nonNullCount,
    largestFiles: fileLineCounts.slice(0, 25),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  const result = await analyzeCodeMetrics();
  const json = JSON.stringify(result, null, 2);
  if (outPath) {
    await writeFile(resolve(process.cwd(), outPath), json);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
