#!/usr/bin/env node
/**
 * Generate plugins.txt manifest from filesystem discovery.
 *
 * Writes one plugin name per line to scripts/plugins.txt.
 * Used by bash scripts (sync-lib.sh) that cannot call Node discovery directly.
 *
 * Usage: node scripts/generate-plugin-list.js
 */

const fs = require('fs');
const path = require('path');
const discovery = require(path.join(__dirname, '..', 'lib', 'discovery'));

const repoRoot = path.join(__dirname, '..');
const plugins = discovery.discoverPlugins(repoRoot);
const outputPath = path.join(__dirname, 'plugins.txt');

fs.writeFileSync(outputPath, plugins.join('\n') + '\n');
console.log(`[OK] Generated ${outputPath} with ${plugins.length} plugins`);
