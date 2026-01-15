#!/usr/bin/env node
/**
 * Platform Detection Infrastructure
 * Auto-detects project configuration for zero-config slash commands
 *
 * Usage: node lib/platform/detect-platform.js
 * Output: JSON with detected platform information
 *
 * @author Avi Fenesh
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Detects CI platform by scanning for configuration files
 * @returns {string|null} CI platform name or null if not detected
 */
function detectCI() {
  if (fs.existsSync('.github/workflows')) return 'github-actions';
  if (fs.existsSync('.gitlab-ci.yml')) return 'gitlab-ci';
  if (fs.existsSync('.circleci/config.yml')) return 'circleci';
  if (fs.existsSync('Jenkinsfile')) return 'jenkins';
  if (fs.existsSync('.travis.yml')) return 'travis';
  return null;
}

/**
 * Detects deployment platform by scanning for platform-specific files
 * @returns {string|null} Deployment platform name or null if not detected
 */
function detectDeployment() {
  if (fs.existsSync('railway.json') || fs.existsSync('railway.toml')) return 'railway';
  if (fs.existsSync('vercel.json')) return 'vercel';
  if (fs.existsSync('netlify.toml') || fs.existsSync('.netlify')) return 'netlify';
  if (fs.existsSync('fly.toml')) return 'fly';
  if (fs.existsSync('.platform.sh')) return 'platform-sh';
  if (fs.existsSync('render.yaml')) return 'render';
  return null;
}

/**
 * Detects project type by scanning for language-specific files
 * @returns {string} Project type identifier
 */
function detectProjectType() {
  if (fs.existsSync('package.json')) return 'nodejs';
  if (fs.existsSync('pyproject.toml') || fs.existsSync('setup.py')) return 'python';
  if (fs.existsSync('Cargo.toml')) return 'rust';
  if (fs.existsSync('go.mod')) return 'go';
  if (fs.existsSync('pom.xml') || fs.existsSync('build.gradle')) return 'java';
  return 'unknown';
}

/**
 * Detects package manager by scanning for lockfiles
 * @returns {string|null} Package manager name or null if not detected
 */
function detectPackageManager() {
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  if (fs.existsSync('bun.lockb')) return 'bun';
  if (fs.existsSync('package-lock.json')) return 'npm';
  if (fs.existsSync('poetry.lock')) return 'poetry';
  if (fs.existsSync('Pipfile.lock')) return 'pipenv';
  if (fs.existsSync('Cargo.lock')) return 'cargo';
  if (fs.existsSync('go.sum')) return 'go';
  return null;
}

/**
 * Detects branch strategy (single-branch vs multi-branch with dev+prod)
 * @returns {string} 'single-branch' or 'multi-branch'
 */
function detectBranchStrategy() {
  try {
    const branches = execSync('git branch -r', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const hasStable = branches.includes('stable');
    const hasProduction = branches.includes('production') || branches.includes('prod');

    if (hasStable || hasProduction) {
      return 'multi-branch'; // dev + prod workflow
    }
    return 'single-branch'; // main only
  } catch {
    return 'single-branch';
  }
}

/**
 * Detects the main branch name
 * @returns {string} Main branch name ('main' or 'master')
 */
function detectMainBranch() {
  try {
    const defaultBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    })
      .trim()
      .replace('refs/remotes/origin/', '');
    return defaultBranch;
  } catch {
    // Fallback: check common names
    try {
      execSync('git rev-parse --verify main', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      return 'main';
    } catch {
      return 'master';
    }
  }
}

/**
 * Main detection function - aggregates all platform information
 * @returns {Object} Platform configuration object
 */
function detect() {
  return {
    ci: detectCI(),
    deployment: detectDeployment(),
    projectType: detectProjectType(),
    packageManager: detectPackageManager(),
    branchStrategy: detectBranchStrategy(),
    mainBranch: detectMainBranch(),
    hasPlanFile: fs.existsSync('PLAN.md'),
    hasTechDebtFile: fs.existsSync('TECHNICAL_DEBT.md'),
    timestamp: new Date().toISOString()
  };
}

// When run directly, output JSON
if (require.main === module) {
  try {
    const result = detect();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2));
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  detect,
  detectCI,
  detectDeployment,
  detectProjectType,
  detectPackageManager,
  detectBranchStrategy,
  detectMainBranch
};
