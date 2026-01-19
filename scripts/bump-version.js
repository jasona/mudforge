#!/usr/bin/env node
/**
 * Version bump script for game and driver versions.
 *
 * Usage:
 *   node scripts/bump-version.js driver [major|minor|patch]
 *   node scripts/bump-version.js game [major|minor|patch]
 *
 * Examples:
 *   node scripts/bump-version.js game           # Bump game version patch (1.0.0 -> 1.0.1)
 *   node scripts/bump-version.js game minor     # Bump game version minor (1.0.0 -> 1.1.0)
 *   node scripts/bump-version.js driver major   # Bump driver version major (0.1.0 -> 1.0.0)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Bump a semantic version string.
 * @param {string} version Current version (e.g., "1.0.0")
 * @param {string} type Bump type: "major", "minor", or "patch"
 * @returns {string} New version string
 */
function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  const [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

// Parse arguments
const [, , target, type = 'patch'] = process.argv;

if (!target || !['driver', 'game'].includes(target)) {
  console.log('Usage: bump-version.js [driver|game] [major|minor|patch]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/bump-version.js game           # Bump game patch version');
  console.log('  node scripts/bump-version.js game minor     # Bump game minor version');
  console.log('  node scripts/bump-version.js driver major   # Bump driver major version');
  process.exit(1);
}

if (!['major', 'minor', 'patch'].includes(type)) {
  console.error(`Invalid bump type: ${type}. Use major, minor, or patch.`);
  process.exit(1);
}

try {
  if (target === 'driver') {
    // Bump driver version in package.json
    const pkgPath = resolve(__dirname, '../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const oldVersion = pkg.version;
    pkg.version = bumpVersion(oldVersion, type);
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Driver version bumped: ${oldVersion} -> ${pkg.version}`);
  } else if (target === 'game') {
    // Bump game version in mudlib/config/game.json
    const configPath = resolve(__dirname, '../mudlib/config/game.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const oldVersion = config.version;
    config.version = bumpVersion(oldVersion, type);
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`Game version bumped: ${oldVersion} -> ${config.version}`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
