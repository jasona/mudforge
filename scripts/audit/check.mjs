#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { analyzeCircularDeps } from './circular-deps.mjs';
import { analyzeCodeMetrics } from './code-metrics.mjs';

const TARGET_CYCLE_PAIRS = [
  ['src/driver/efun-bridge.ts', 'src/driver/mudlib-loader.ts'],
  ['mudlib/std/living.ts', 'mudlib/daemons/portrait.ts'],
  ['mudlib/daemons/combat.ts', 'mudlib/daemons/party.ts'],
];

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function hasCyclePair(cycles, a, b) {
  return cycles.some((cycle) => cycle.includes(a) && cycle.includes(b));
}

function getLargestLineCount(metrics, file) {
  const found = metrics.largestFiles.find((f) => f.file === file);
  return found ? found.lines : 0;
}

async function main() {
  const repoRoot = process.cwd();
  const cycleBaselinePath = resolve(repoRoot, 'docs/audit/baseline/circular-deps.json');
  const metricsBaselinePath = resolve(repoRoot, 'docs/audit/baseline/code-metrics.json');

  const [cycleBaseline, metricsBaseline, cycles, metrics] = await Promise.all([
    readJson(cycleBaselinePath),
    readJson(metricsBaselinePath),
    analyzeCircularDeps(repoRoot),
    analyzeCodeMetrics(repoRoot),
  ]);

  const failures = [];

  if (cycles.cycleCount > cycleBaseline.cycleCount) {
    failures.push(
      `Cycle count increased: baseline=${cycleBaseline.cycleCount}, current=${cycles.cycleCount}`
    );
  }

  for (const [a, b] of TARGET_CYCLE_PAIRS) {
    if (hasCyclePair(cycles.cycles, a, b)) {
      failures.push(`Target cycle still present: ${a} <-> ${b}`);
    }
  }

  if (metrics.anyCount > metricsBaseline.anyCount) {
    failures.push(
      `any count increased: baseline=${metricsBaseline.anyCount}, current=${metrics.anyCount}`
    );
  }

  if (metrics.asCount > metricsBaseline.asCount) {
    failures.push(`as count increased: baseline=${metricsBaseline.asCount}, current=${metrics.asCount}`);
  }

  if (metrics.nonNullCount > metricsBaseline.nonNullCount) {
    failures.push(
      `non-null assertion count increased: baseline=${metricsBaseline.nonNullCount}, current=${metrics.nonNullCount}`
    );
  }

  const boundedFiles = [
    'src/driver/efun-bridge.ts',
    'mudlib/lib/area-builder-gui.ts',
  ];
  for (const file of boundedFiles) {
    const baselineLines = getLargestLineCount(metricsBaseline, file);
    const currentLines = getLargestLineCount(metrics, file);
    if (baselineLines > 0 && currentLines > baselineLines) {
      failures.push(`File grew past baseline: ${file} baseline=${baselineLines} current=${currentLines}`);
    }
  }

  if (failures.length > 0) {
    console.error('Audit checks failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Audit checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
