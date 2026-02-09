#!/usr/bin/env node
import { readdir, readFile, writeFile, access } from 'fs/promises';
import { resolve, dirname, extname, relative } from 'path';

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

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveImportPath(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;

  const fromDir = dirname(fromFile);
  const direct = resolve(fromDir, specifier);
  const candidates = [
    direct,
    `${direct}.ts`,
    `${direct}.js`,
    resolve(direct, 'index.ts'),
    resolve(direct, 'index.js'),
  ];

  for (const candidate of candidates) {
    let tsCandidate = candidate;
    if (extname(candidate) === '.js') {
      tsCandidate = candidate.replace(/\.js$/, '.ts');
    }
    if (await exists(tsCandidate)) {
      return tsCandidate;
    }
  }

  return null;
}

function parseSpecifiers(source) {
  const specs = [];
  const importFromRe = /import\s+(?:type\s+)?[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g;
  const sideEffectRe = /import\s+['"]([^'"]+)['"]/g;
  const dynamicRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const re of [importFromRe, sideEffectRe, dynamicRe]) {
    let match;
    while ((match = re.exec(source)) !== null) {
      if (match[1]) specs.push(match[1]);
    }
  }
  return specs;
}

function normalizeCycle(cycle) {
  const withoutDuplicateTail = cycle.slice(0, -1);
  const n = withoutDuplicateTail.length;
  let best = null;
  for (let i = 0; i < n; i++) {
    const rotated = [...withoutDuplicateTail.slice(i), ...withoutDuplicateTail.slice(0, i)];
    const key = rotated.join(' -> ');
    if (!best || key < best.key) {
      best = { key, cycle: [...rotated, rotated[0]] };
    }
  }
  return best.cycle;
}

export async function analyzeCircularDeps(repoRoot = process.cwd()) {
  const roots = ROOTS.map((r) => resolve(repoRoot, r));
  const files = [];
  for (const root of roots) {
    files.push(...(await walk(root)));
  }
  const fileSet = new Set(files);

  const graph = new Map();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const specs = parseSpecifiers(source);
    const deps = [];
    for (const spec of specs) {
      const candidate = await resolveImportPath(file, spec);
      if (!candidate) continue;
      const resolved = candidate.replace(/\.js$/, '.ts');
      if (fileSet.has(resolved)) deps.push(resolved);
    }
    graph.set(file, deps);
  }

  const visited = new Set();
  const onStack = new Set();
  const stack = [];
  const found = new Map();

  function dfs(node) {
    visited.add(node);
    onStack.add(node);
    stack.push(node);

    const deps = graph.get(node) ?? [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        dfs(dep);
      } else if (onStack.has(dep)) {
        const startIdx = stack.indexOf(dep);
        const cycle = [...stack.slice(startIdx), dep];
        const normalized = normalizeCycle(cycle);
        const key = normalized.join(' -> ');
        found.set(key, normalized);
      }
    }

    stack.pop();
    onStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) dfs(node);
  }

  const cycles = [...found.values()].map((cycle) =>
    cycle.map((absPath) => relative(repoRoot, absPath).replaceAll('\\', '/'))
  );

  const result = {
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    cycleCount: cycles.length,
    cycles,
  };

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  const result = await analyzeCircularDeps();
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
