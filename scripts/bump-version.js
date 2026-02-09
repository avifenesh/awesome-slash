#!/usr/bin/env node
/**
 * Version Bump Tool
 *
 * Usage:
 *   node scripts/bump-version.js <version>
 *   node scripts/bump-version.js 3.7.3
 *   node scripts/bump-version.js 3.7.3-rc.1
 *
 * Updates all version files:
 * - package.json
 * - .claude-plugin/plugin.json
 * - .claude-plugin/marketplace.json
 * - All plugin.json files in plugins/
 */

const fs = require('fs');
const path = require('path');
const discovery = require(path.join(__dirname, '..', 'lib', 'discovery'));

const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

// Discover plugins from filesystem
const PLUGIN_NAMES = discovery.discoverPlugins(path.join(__dirname, '..'));

function updateJsonFile(filePath, version) {
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] ${filePath} (not found)`);
    return false;
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const oldVersion = content.version;
  content.version = version;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`  [OK] ${filePath}: ${oldVersion} -> ${version}`);
  return true;
}

function updateMarketplaceJson(filePath, version) {
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] ${filePath} (not found)`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const oldVersionMatch = content.match(/"version":\s*"([^"]+)"/);
  const oldVersion = oldVersionMatch ? oldVersionMatch[1] : 'unknown';

  // Replace all version occurrences
  content = content.replace(/"version":\s*"[^"]+"/g, `"version": "${version}"`);
  fs.writeFileSync(filePath, content);

  const count = (content.match(/"version":/g) || []).length;
  console.log(`  [OK] ${filePath}: ${oldVersion} -> ${version} (${count} occurrences)`);
  return true;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Version Bump Tool

Usage:
  node scripts/bump-version.js <version>

Examples:
  node scripts/bump-version.js 3.7.3        # Stable release
  node scripts/bump-version.js 3.7.3-rc.1   # Release candidate
  node scripts/bump-version.js 3.8.0-beta.1 # Beta release

Files updated:
  - package.json
  - .claude-plugin/plugin.json
  - .claude-plugin/marketplace.json
  - plugins/*/.claude-plugin/plugin.json (${PLUGIN_NAMES.length} plugins)
`);
    process.exit(0);
  }

  const newVersion = args[0];

  if (!VERSION_PATTERN.test(newVersion)) {
    console.error(`[ERROR] Invalid version format: ${newVersion}`);
    console.error('Expected: X.Y.Z or X.Y.Z-prerelease (e.g., 3.7.3, 3.7.3-rc.1)');
    process.exit(1);
  }

  console.log(`\nBumping version to: ${newVersion}\n`);

  // Update main package.json
  console.log('Main package:');
  updateJsonFile('package.json', newVersion);

  // Update root plugin.json
  console.log('\nRoot plugin:');
  updateJsonFile('.claude-plugin/plugin.json', newVersion);

  // Update marketplace.json
  console.log('\nMarketplace:');
  updateMarketplaceJson('.claude-plugin/marketplace.json', newVersion);

  // Update all plugin.json files
  console.log('\nPlugins:');
  for (const plugin of PLUGIN_NAMES) {
    const pluginPath = path.join('plugins', plugin, '.claude-plugin', 'plugin.json');
    updateJsonFile(pluginPath, newVersion);
  }

  console.log(`
[OK] Version bump complete!

Next steps:
  1. Update CHANGELOG.md with release notes
  2. git add -A && git commit -m "chore: release v${newVersion}"
  3. git tag v${newVersion}
  4. git push origin main v${newVersion}
`);
}

main();
