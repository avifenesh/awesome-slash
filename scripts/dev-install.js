#!/usr/bin/env node
/**
 * Development installer for awesome-slash
 *
 * Installs the current local version to all tools at once for quick testing.
 * Use this during development to test changes before publishing.
 *
 * Usage:
 *   node scripts/dev-install.js           # Install to all tools (Claude, OpenCode, Codex)
 *   node scripts/dev-install.js claude    # Install to Claude only
 *   node scripts/dev-install.js opencode  # Install to OpenCode only
 *   node scripts/dev-install.js codex     # Install to Codex only
 *   node scripts/dev-install.js --clean   # Remove all installations first
 *
 * This script:
 *   - Uses local source files (not npm package)
 *   - Installs Claude in development mode (bypasses marketplace)
 *   - Strips models from OpenCode agents (default)
 *   - Runs synchronously for quick feedback
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Source directory is the project root
const SOURCE_DIR = path.join(__dirname, '..');
const VERSION = require(path.join(SOURCE_DIR, 'package.json')).version;

// Target directories
const HOME = process.env.HOME || process.env.USERPROFILE;
const CLAUDE_PLUGINS_DIR = path.join(HOME, '.claude', 'plugins');
const OPENCODE_DIR = path.join(HOME, '.opencode');
const OPENCODE_CONFIG_DIR = path.join(HOME, '.config', 'opencode');
const CODEX_DIR = path.join(HOME, '.codex');
const AWESOME_SLASH_DIR = path.join(HOME, '.awesome-slash');

// Plugins list
const PLUGINS = ['next-task', 'ship', 'deslop', 'audit-project', 'drift-detect', 'enhance', 'sync-docs', 'repo-map', 'perf'];

function log(msg) {
  console.log(`[dev-install] ${msg}`);
}

function commandExists(cmd) {
  try {
    execSync(`${process.platform === 'win32' ? 'where' : 'which'} ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean all installations
 */
function cleanAll() {
  log('Cleaning all installations...');

  // Clean Claude plugins
  for (const plugin of PLUGINS) {
    const pluginDir = path.join(CLAUDE_PLUGINS_DIR, `${plugin}@awesome-slash`);
    if (fs.existsSync(pluginDir)) {
      fs.rmSync(pluginDir, { recursive: true, force: true });
      log(`  Removed Claude plugin: ${plugin}`);
    }
  }

  // Clean OpenCode
  const opencodeCommandsDir = path.join(OPENCODE_DIR, 'commands', 'awesome-slash');
  const opencodePluginDir = path.join(OPENCODE_DIR, 'plugins', 'awesome-slash');
  const opencodeAgentsDir = path.join(OPENCODE_DIR, 'agents');

  if (fs.existsSync(opencodeCommandsDir)) {
    fs.rmSync(opencodeCommandsDir, { recursive: true, force: true });
    log('  Removed OpenCode commands');
  }
  if (fs.existsSync(opencodePluginDir)) {
    fs.rmSync(opencodePluginDir, { recursive: true, force: true });
    log('  Removed OpenCode plugin');
  }
  // Clean agent files installed by us - only known awesome-slash agents
  if (fs.existsSync(opencodeAgentsDir)) {
    // List of agent filenames we install (from plugins/*/agents/*.md)
    const knownAgents = [
      'plan-synthesizer.md', 'enhancement-reporter.md', 'ci-fixer.md',
      'deslop-work.md', 'simple-fixer.md', 'perf-analyzer.md', 'perf-code-paths.md',
      'perf-investigation-logger.md', 'perf-theory-gatherer.md', 'perf-theory-tester.md',
      'map-validator.md', 'exploration-agent.md', 'perf-orchestrator.md', 'ci-monitor.md',
      'implementation-agent.md', 'planning-agent.md', 'test-coverage-checker.md',
      'plugin-enhancer.md', 'agent-enhancer.md', 'docs-enhancer.md', 'claudemd-enhancer.md',
      'prompt-enhancer.md', 'hooks-enhancer.md', 'skills-enhancer.md', 'enhancement-orchestrator.md',
      'task-discoverer.md', 'delivery-validator.md', 'docs-updater.md', 'worktree-manager.md',
      'deslop-analyzer.md', 'docs-analyzer.md', 'docs-validator.md'
    ];
    let removedCount = 0;
    for (const file of knownAgents) {
      const filePath = path.join(opencodeAgentsDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        removedCount++;
      }
    }
    if (removedCount > 0) {
      log(`  Removed ${removedCount} OpenCode agents`);
    }
  }

  // Clean Codex
  const codexSkillsDir = path.join(CODEX_DIR, 'skills');
  if (fs.existsSync(codexSkillsDir)) {
    for (const skill of fs.readdirSync(codexSkillsDir)) {
      const skillPath = path.join(codexSkillsDir, skill);
      // Only remove skills we know are ours
      if (['next-task', 'ship', 'deslop', 'audit-project', 'drift-detect', 'enhance', 'sync-docs', 'repo-map', 'perf', 'delivery-approval'].includes(skill)) {
        fs.rmSync(skillPath, { recursive: true, force: true });
        log(`  Removed Codex skill: ${skill}`);
      }
    }
  }

  // Clean ~/.awesome-slash
  if (fs.existsSync(AWESOME_SLASH_DIR)) {
    fs.rmSync(AWESOME_SLASH_DIR, { recursive: true, force: true });
    log('  Removed ~/.awesome-slash');
  }

  log('Clean complete.');
}

/**
 * Install for Claude in development mode
 */
function installClaude() {
  log('Installing for Claude Code (development mode)...');

  if (!commandExists('claude')) {
    log('  [SKIP] Claude CLI not found');
    return false;
  }

  // Remove marketplace plugins first
  try {
    execSync('claude plugin marketplace remove avifenesh/awesome-slash', { stdio: 'pipe' });
    log('  Removed marketplace');
  } catch {
    // May not exist
  }

  for (const plugin of PLUGINS) {
    try {
      execSync(`claude plugin uninstall ${plugin}@awesome-slash`, { stdio: 'pipe' });
    } catch {
      // May not be installed
    }
  }

  // Create plugins directory
  fs.mkdirSync(CLAUDE_PLUGINS_DIR, { recursive: true });

  // Copy each plugin directly from source
  for (const plugin of PLUGINS) {
    const srcDir = path.join(SOURCE_DIR, 'plugins', plugin);
    const destDir = path.join(CLAUDE_PLUGINS_DIR, `${plugin}@awesome-slash`);

    if (fs.existsSync(srcDir)) {
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
      }

      fs.cpSync(srcDir, destDir, {
        recursive: true,
        filter: (src) => {
          const basename = path.basename(src);
          return basename !== 'node_modules' && basename !== '.git';
        }
      });
      log(`  [OK] ${plugin}`);
    }
  }

  log('Claude installation complete.');
  return true;
}

/**
 * Install for OpenCode
 */
function installOpenCode() {
  log('Installing for OpenCode...');

  // Create directories
  const commandsDir = path.join(OPENCODE_DIR, 'commands', 'awesome-slash');
  const pluginDir = path.join(OPENCODE_DIR, 'plugins', 'awesome-slash');
  const agentsDir = path.join(OPENCODE_DIR, 'agents');
  const configDir = OPENCODE_CONFIG_DIR;
  const configPath = path.join(configDir, 'opencode.json');

  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });

  // Copy to ~/.awesome-slash first (OpenCode needs local files)
  copyToAwesomeSlash();

  // Update MCP config
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      config = {};
    }
  }

  config.mcp = config.mcp || {};
  config.mcp['awesome-slash'] = {
    type: 'local',
    command: ['node', path.join(AWESOME_SLASH_DIR, 'mcp-server', 'index.js')],
    environment: {
      PLUGIN_ROOT: AWESOME_SLASH_DIR,
      AI_STATE_DIR: '.opencode'
    },
    enabled: true
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Copy native plugin
  const pluginSrcDir = path.join(SOURCE_DIR, 'adapters', 'opencode-plugin');
  if (fs.existsSync(pluginSrcDir)) {
    for (const file of ['index.ts', 'package.json']) {
      const srcPath = path.join(pluginSrcDir, file);
      const destPath = path.join(pluginDir, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    log('  [OK] Native plugin');
  }

  // Transform helpers
  function transformForOpenCode(content) {
    content = content.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, '${PLUGIN_ROOT}');
    content = content.replace(/\$CLAUDE_PLUGIN_ROOT/g, '$PLUGIN_ROOT');
    content = content.replace(/\.claude\//g, '.opencode/');
    content = content.replace(/\.claude'/g, ".opencode'");
    content = content.replace(/\.claude"/g, '.opencode"');
    content = content.replace(/\.claude`/g, '.opencode`');
    return content;
  }

  function transformCommandFrontmatter(content) {
    return content.replace(
      /^---\n([\s\S]*?)^---/m,
      (match, frontmatter) => {
        const lines = frontmatter.trim().split('\n');
        const parsed = {};
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim();
            const value = line.substring(colonIdx + 1).trim();
            parsed[key] = value;
          }
        }
        let opencodeFrontmatter = '---\n';
        if (parsed.description) opencodeFrontmatter += `description: ${parsed.description}\n`;
        opencodeFrontmatter += 'agent: general\n---';
        return opencodeFrontmatter;
      }
    );
  }

  // Copy commands
  const commandMappings = [
    ['deslop.md', 'deslop', 'deslop.md'],
    ['enhance.md', 'enhance', 'enhance.md'],
    ['next-task.md', 'next-task', 'next-task.md'],
    ['delivery-approval.md', 'next-task', 'delivery-approval.md'],
    ['sync-docs.md', 'sync-docs', 'sync-docs.md'],
    ['audit-project.md', 'audit-project', 'audit-project.md'],
    ['ship.md', 'ship', 'ship.md'],
    ['drift-detect.md', 'drift-detect', 'drift-detect.md'],
    ['repo-map.md', 'repo-map', 'repo-map.md'],
    ['perf.md', 'perf', 'perf.md']
  ];

  for (const [target, plugin, source] of commandMappings) {
    const srcPath = path.join(SOURCE_DIR, 'plugins', plugin, 'commands', source);
    const destPath = path.join(commandsDir, target);
    if (fs.existsSync(srcPath)) {
      let content = fs.readFileSync(srcPath, 'utf8');
      content = transformForOpenCode(content);
      content = transformCommandFrontmatter(content);
      fs.writeFileSync(destPath, content);
    }
  }
  log('  [OK] Commands');

  // Copy agents (strip models by default)
  let agentCount = 0;
  for (const plugin of PLUGINS) {
    const srcAgentsDir = path.join(SOURCE_DIR, 'plugins', plugin, 'agents');
    if (fs.existsSync(srcAgentsDir)) {
      const agentFiles = fs.readdirSync(srcAgentsDir).filter(f => f.endsWith('.md'));
      for (const agentFile of agentFiles) {
        const srcPath = path.join(srcAgentsDir, agentFile);
        const destPath = path.join(agentsDir, agentFile);
        let content = fs.readFileSync(srcPath, 'utf8');

        content = transformForOpenCode(content);

        // Transform agent frontmatter (strip models)
        content = content.replace(
          /^---\n([\s\S]*?)^---/m,
          (match, frontmatter) => {
            const lines = frontmatter.trim().split('\n');
            const parsed = {};
            for (const line of lines) {
              const colonIdx = line.indexOf(':');
              if (colonIdx > 0) {
                const key = line.substring(0, colonIdx).trim();
                const value = line.substring(colonIdx + 1).trim();
                parsed[key] = value;
              }
            }

            let opencodeFrontmatter = '---\n';
            if (parsed.name) opencodeFrontmatter += `name: ${parsed.name}\n`;
            if (parsed.description) opencodeFrontmatter += `description: ${parsed.description}\n`;
            opencodeFrontmatter += 'mode: subagent\n';
            // NOTE: Models are stripped by default for dev installs

            if (parsed.tools) {
              opencodeFrontmatter += 'permission:\n';
              const tools = parsed.tools.toLowerCase();
              opencodeFrontmatter += `  read: ${tools.includes('read') ? 'allow' : 'deny'}\n`;
              opencodeFrontmatter += `  edit: ${tools.includes('edit') || tools.includes('write') ? 'allow' : 'deny'}\n`;
              opencodeFrontmatter += `  bash: ${tools.includes('bash') ? 'allow' : 'ask'}\n`;
              opencodeFrontmatter += `  glob: ${tools.includes('glob') ? 'allow' : 'deny'}\n`;
              opencodeFrontmatter += `  grep: ${tools.includes('grep') ? 'allow' : 'deny'}\n`;
            }

            opencodeFrontmatter += '---';
            return opencodeFrontmatter;
          }
        );

        fs.writeFileSync(destPath, content);
        agentCount++;
      }
    }
  }
  log(`  [OK] ${agentCount} agents`);
  log('OpenCode installation complete.');
  return true;
}

/**
 * Install for Codex
 */
function installCodex() {
  log('Installing for Codex CLI...');

  const configDir = CODEX_DIR;
  const configPath = path.join(configDir, 'config.toml');
  const skillsDir = path.join(configDir, 'skills');

  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  // Copy to ~/.awesome-slash first
  copyToAwesomeSlash();

  // Update MCP config
  const mcpPath = path.join(AWESOME_SLASH_DIR, 'mcp-server', 'index.js').replace(/\\/g, '\\\\');
  const pluginRoot = AWESOME_SLASH_DIR.replace(/\\/g, '\\\\');

  let configContent = '';
  if (fs.existsSync(configPath)) {
    configContent = fs.readFileSync(configPath, 'utf8');
  }

  // Remove existing awesome-slash section
  const lines = configContent.split('\n');
  const filteredLines = [];
  let inAwesomeSlashSection = false;

  for (const line of lines) {
    if (line.match(/^\[mcp_servers\.awesome-slash/)) {
      inAwesomeSlashSection = true;
      continue;
    }
    if (line.match(/^\[/) && !line.match(/^\[mcp_servers\.awesome-slash/)) {
      inAwesomeSlashSection = false;
    }
    if (!inAwesomeSlashSection) {
      filteredLines.push(line);
    }
  }

  configContent = filteredLines.join('\n').trimEnd();

  configContent += `

[mcp_servers.awesome-slash]
command = "node"
args = ["${mcpPath}"]

[mcp_servers.awesome-slash.env]
PLUGIN_ROOT = "${pluginRoot}"
AI_STATE_DIR = ".codex"
`;

  fs.writeFileSync(configPath, configContent);

  // Skill mappings
  const skillMappings = [
    ['enhance', 'enhance', 'enhance.md', 'Runs enhancement analyzers on prompts, agents, plugins, docs.'],
    ['next-task', 'next-task', 'next-task.md', 'Orchestrates complete task-to-production workflow.'],
    ['ship', 'ship', 'ship.md', 'Complete PR workflow: commit, create PR, monitor CI, merge.'],
    ['deslop', 'deslop', 'deslop.md', 'Detects and removes AI-generated slop patterns.'],
    ['audit-project', 'audit-project', 'audit-project.md', 'Multi-agent iterative code review.'],
    ['drift-detect', 'drift-detect', 'drift-detect.md', 'Analyzes documentation vs actual code.'],
    ['repo-map', 'repo-map', 'repo-map.md', 'Builds AST-based repo map using ast-grep.'],
    ['perf', 'perf', 'perf.md', 'Structured perf investigations with baselines.'],
    ['delivery-approval', 'next-task', 'delivery-approval.md', 'Autonomous validation for shipping.'],
    ['sync-docs', 'sync-docs', 'sync-docs.md', 'Compares documentation to actual code.']
  ];

  for (const [skillName, plugin, sourceFile, description] of skillMappings) {
    const srcPath = path.join(SOURCE_DIR, 'plugins', plugin, 'commands', sourceFile);
    const skillDir = path.join(skillsDir, skillName);
    const destPath = path.join(skillDir, 'SKILL.md');

    if (fs.existsSync(srcPath)) {
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
      fs.mkdirSync(skillDir, { recursive: true });

      let content = fs.readFileSync(srcPath, 'utf8');

      const escapedDescription = description.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const yamlDescription = `"${escapedDescription}"`;

      if (content.startsWith('---')) {
        content = content.replace(
          /^---\n[\s\S]*?\n---\n/,
          `---\nname: ${skillName}\ndescription: ${yamlDescription}\n---\n`
        );
      } else {
        content = `---\nname: ${skillName}\ndescription: ${yamlDescription}\n---\n\n${content}`;
      }

      // Use absolute path to local install
      const pluginInstallPath = path.join(AWESOME_SLASH_DIR, 'plugins', plugin);
      content = content.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, pluginInstallPath);
      content = content.replace(/\$CLAUDE_PLUGIN_ROOT/g, pluginInstallPath);
      content = content.replace(/\$\{PLUGIN_ROOT\}/g, pluginInstallPath);
      content = content.replace(/\$PLUGIN_ROOT/g, pluginInstallPath);

      fs.writeFileSync(destPath, content);
      log(`  [OK] ${skillName}`);
    }
  }

  log('Codex installation complete.');
  return true;
}

/**
 * Copy source to ~/.awesome-slash (for OpenCode/Codex)
 */
let awesomeSlashCopied = false;
function copyToAwesomeSlash() {
  if (awesomeSlashCopied) return;

  log('Copying to ~/.awesome-slash...');

  if (fs.existsSync(AWESOME_SLASH_DIR)) {
    fs.rmSync(AWESOME_SLASH_DIR, { recursive: true, force: true });
  }

  fs.cpSync(SOURCE_DIR, AWESOME_SLASH_DIR, {
    recursive: true,
    filter: (src) => {
      const basename = path.basename(src);
      return basename !== 'node_modules' && basename !== '.git';
    }
  });

  // Install dependencies
  log('  Installing dependencies...');
  execSync('npm install --production', { cwd: AWESOME_SLASH_DIR, stdio: 'pipe' });

  const mcpDir = path.join(AWESOME_SLASH_DIR, 'mcp-server');
  if (fs.existsSync(path.join(mcpDir, 'package.json'))) {
    execSync('npm install --production', { cwd: mcpDir, stdio: 'pipe' });
  }

  awesomeSlashCopied = true;
  log('  [OK] ~/.awesome-slash');
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);

  console.log(`\n[dev-install] awesome-slash v${VERSION}\n`);

  // Handle --clean flag
  if (args.includes('--clean')) {
    cleanAll();
    console.log();
    return;
  }

  // Determine which tools to install
  const validTools = ['claude', 'opencode', 'codex'];
  let tools = args.filter(a => validTools.includes(a.toLowerCase())).map(a => a.toLowerCase());

  if (tools.length === 0) {
    // Default: install to all tools
    tools = validTools;
  }

  log(`Installing to: ${tools.join(', ')}\n`);

  const results = {};

  for (const tool of tools) {
    switch (tool) {
      case 'claude':
        results.claude = installClaude();
        break;
      case 'opencode':
        results.opencode = installOpenCode();
        break;
      case 'codex':
        results.codex = installCodex();
        break;
    }
    console.log();
  }

  // Summary
  console.log('─'.repeat(50));
  log('Summary:');
  for (const [tool, success] of Object.entries(results)) {
    log(`  ${tool}: ${success ? '[OK]' : '[SKIP]'}`);
  }
  console.log();
  log('To clean all: node scripts/dev-install.js --clean');
  log('To revert Claude to marketplace: awesome-slash --tool claude');
  console.log();
}

main();
