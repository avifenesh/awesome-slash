/**
 * Tests for enhance analyzers (plugin-analyzer, agent-analyzer)
 * Covers: pattern detection, severity classification, auto-fix generation, edge cases
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Import analyzers
const pluginAnalyzer = require('../lib/enhance/plugin-analyzer');
const agentAnalyzer = require('../lib/enhance/agent-analyzer');
const { pluginPatterns } = require('../lib/enhance/plugin-patterns');
const { agentPatterns, getAllPatterns, getPatternsByCertainty, getPatternsByCategory, getAutoFixablePatterns } = require('../lib/enhance/agent-patterns');

describe('Plugin Analyzer', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-analyzer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('analyzePlugin', () => {
    test('should detect missing plugin.json', async () => {
      const pluginDir = path.join(tempDir, 'empty-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      expect(result.pluginName).toBe('empty-plugin');
      expect(result.filesScanned).toBe(0);
    });

    test('should detect malformed plugin.json', async () => {
      const pluginDir = path.join(tempDir, 'bad-json');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), 'not valid json');

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      expect(result.structureIssues.length).toBeGreaterThan(0);
      expect(result.structureIssues[0].patternId).toBe('malformed_plugin_json');
    });

    test('should detect missing required fields', async () => {
      const pluginDir = path.join(tempDir, 'missing-fields');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        // Missing name, version, description
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      const missingFields = result.structureIssues.find(i => i.patternId === 'missing_required_plugin_fields');
      expect(missingFields).toBeDefined();
      expect(missingFields.certainty).toBe('HIGH');
    });

    test('should detect invalid version format', async () => {
      const pluginDir = path.join(tempDir, 'bad-version');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: 'not-semver',
        description: 'Test plugin'
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      const versionIssue = result.structureIssues.find(i => i.patternId === 'invalid_version_format');
      expect(versionIssue).toBeDefined();
      expect(versionIssue.certainty).toBe('HIGH');
    });

    test('should detect version mismatch with package.json', async () => {
      const pluginDir = path.join(tempDir, 'version-mismatch');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin'
      }));
      fs.writeFileSync(path.join(pluginDir, 'package.json'), JSON.stringify({
        name: 'test',
        version: '2.0.0'
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      const mismatch = result.structureIssues.find(i => i.patternId === 'version_mismatch');
      expect(mismatch).toBeDefined();
      expect(mismatch.certainty).toBe('HIGH');
      expect(mismatch.issue).toContain('1.0.0');
      expect(mismatch.issue).toContain('2.0.0');
    });

    test('should detect missing tool description', async () => {
      const pluginDir = path.join(tempDir, 'no-desc');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [{
          name: 'test-cmd'
          // Missing description
        }]
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      const descIssue = result.toolIssues.find(i => i.patternId === 'missing_tool_description');
      expect(descIssue).toBeDefined();
      expect(descIssue.tool).toBe('test-cmd');
    });

    test('should detect missing additionalProperties in schema', async () => {
      const pluginDir = path.join(tempDir, 'no-addl-props');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [{
          name: 'test-cmd',
          description: 'A test command',
          parameters: {
            type: 'object',
            properties: {
              arg1: { type: 'string' }
            }
            // Missing additionalProperties: false
          }
        }]
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      const addlPropsIssue = result.toolIssues.find(i => i.patternId === 'missing_additional_properties');
      expect(addlPropsIssue).toBeDefined();
      expect(addlPropsIssue.certainty).toBe('HIGH');
      expect(addlPropsIssue.autoFixFn).toBeDefined();
    });

    test('should detect missing required fields in schema', async () => {
      const pluginDir = path.join(tempDir, 'no-required');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [{
          name: 'test-cmd',
          description: 'A test command',
          parameters: {
            type: 'object',
            properties: {
              arg1: { type: 'string' }
            }
            // Missing required array
          }
        }]
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      const reqIssue = result.toolIssues.find(i => i.patternId === 'missing_required_fields');
      expect(reqIssue).toBeDefined();
    });

    test('should detect tool overexposure with verbose option', async () => {
      const pluginDir = path.join(tempDir, 'many-tools');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });

      const commands = [];
      for (let i = 0; i < 12; i++) {
        commands.push({ name: `cmd-${i}`, description: `Command ${i}` });
      }

      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        commands
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir, { verbose: true });

      const overexposure = result.structureIssues.find(i => i.patternId === 'tool_overexposure');
      expect(overexposure).toBeDefined();
      expect(overexposure.certainty).toBe('LOW');
    });

    test('should scan agent files for security issues', async () => {
      const pluginDir = path.join(tempDir, 'with-agents');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      const agentsDir = path.join(pluginDir, 'agents');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.mkdirSync(agentsDir, { recursive: true });

      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin'
      }));

      // Agent with security concern (eval)
      fs.writeFileSync(path.join(agentsDir, 'test-agent.md'), `---
name: test-agent
description: Test agent
---

You can use eval() to execute code.
`);

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      expect(result.filesScanned).toBeGreaterThanOrEqual(2); // plugin.json + agent
    });

    test('should handle valid plugin with no issues', async () => {
      const pluginDir = path.join(tempDir, 'valid-plugin');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [{
          name: 'test-cmd',
          description: 'A test command',
          parameters: {
            type: 'object',
            properties: {
              arg1: { type: 'string', description: 'First argument' }
            },
            required: ['arg1'],
            additionalProperties: false
          }
        }]
      }));

      fs.writeFileSync(path.join(pluginDir, 'package.json'), JSON.stringify({
        name: 'test',
        version: '1.0.0'
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);

      // Should have minimal issues (maybe no tool issues at all)
      expect(result.toolIssues.filter(i => i.certainty === 'HIGH').length).toBe(0);
    });
  });

  describe('analyzeAllPlugins', () => {
    test('should analyze multiple plugins', async () => {
      const pluginsDir = path.join(tempDir, 'plugins');

      // Create two plugins
      for (const name of ['plugin-a', 'plugin-b']) {
        const pluginDir = path.join(pluginsDir, name);
        const claudePlugin = path.join(pluginDir, '.claude-plugin');
        fs.mkdirSync(claudePlugin, { recursive: true });
        fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
          name,
          version: '1.0.0',
          description: `${name} plugin`
        }));
      }

      const results = await pluginAnalyzer.analyzeAllPlugins(pluginsDir);

      expect(results.length).toBe(2);
      expect(results.map(r => r.pluginName)).toContain('plugin-a');
      expect(results.map(r => r.pluginName)).toContain('plugin-b');
    });

    test('should return empty array for non-existent directory', async () => {
      const results = await pluginAnalyzer.analyzeAllPlugins('/nonexistent/path');
      expect(results).toEqual([]);
    });
  });

  describe('generateReport', () => {
    test('should generate report for single plugin', async () => {
      const pluginDir = path.join(tempDir, 'report-test');
      const claudePlugin = path.join(pluginDir, '.claude-plugin');
      fs.mkdirSync(claudePlugin, { recursive: true });
      fs.writeFileSync(path.join(claudePlugin, 'plugin.json'), JSON.stringify({
        name: 'report-test',
        version: '1.0.0',
        description: 'Test plugin'
      }));

      const result = await pluginAnalyzer.analyzePlugin(pluginDir);
      const report = pluginAnalyzer.generateReport(result);

      expect(report).toContain('report-test');
      expect(typeof report).toBe('string');
    });

    test('should generate summary report for multiple plugins', async () => {
      const results = [
        {
          pluginName: 'plugin-a',
          pluginPath: '/path/to/a',
          filesScanned: 2,
          toolIssues: [{ certainty: 'HIGH' }],
          structureIssues: [],
          securityIssues: []
        },
        {
          pluginName: 'plugin-b',
          pluginPath: '/path/to/b',
          filesScanned: 1,
          toolIssues: [],
          structureIssues: [{ certainty: 'MEDIUM' }],
          securityIssues: []
        }
      ];

      const report = pluginAnalyzer.generateReport(results);

      expect(report).toContain('plugin-a');
      expect(report).toContain('plugin-b');
    });
  });
});

describe('Agent Analyzer', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-analyzer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseMarkdownFrontmatter', () => {
    const { parseMarkdownFrontmatter } = agentAnalyzer;

    test('should parse valid frontmatter', () => {
      const content = `---
name: test-agent
description: A test agent
model: sonnet
---

Body content here.`;

      const { frontmatter, body } = parseMarkdownFrontmatter(content);

      expect(frontmatter.name).toBe('test-agent');
      expect(frontmatter.description).toBe('A test agent');
      expect(frontmatter.model).toBe('sonnet');
      expect(body).toContain('Body content here');
    });

    test('should handle missing frontmatter', () => {
      const content = '# Just a heading\n\nSome body text.';
      const { frontmatter, body } = parseMarkdownFrontmatter(content);

      expect(frontmatter).toBeNull();
      expect(body).toBe(content);
    });

    test('should handle null/undefined input', () => {
      expect(parseMarkdownFrontmatter(null).frontmatter).toBeNull();
      expect(parseMarkdownFrontmatter(undefined).frontmatter).toBeNull();
      expect(parseMarkdownFrontmatter(123).frontmatter).toBeNull();
    });

    test('should handle unclosed frontmatter', () => {
      const content = `---
name: test
description: No closing`;

      const { frontmatter } = parseMarkdownFrontmatter(content);
      expect(frontmatter).toBeNull();
    });
  });

  describe('analyzeAgent', () => {
    test('should detect file not found', () => {
      const result = agentAnalyzer.analyzeAgent('/nonexistent/path.md');

      expect(result.structureIssues.length).toBe(1);
      expect(result.structureIssues[0].patternId).toBe('file_not_found');
      expect(result.structureIssues[0].certainty).toBe('HIGH');
    });

    test('should detect missing frontmatter', () => {
      const agentPath = path.join(tempDir, 'no-fm.md');
      fs.writeFileSync(agentPath, '# Agent without frontmatter\n\nSome content.');

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const fmIssue = result.structureIssues.find(i => i.patternId === 'missing_frontmatter');
      expect(fmIssue).toBeDefined();
      expect(fmIssue.certainty).toBe('HIGH');
    });

    test('should detect missing name in frontmatter', () => {
      const agentPath = path.join(tempDir, 'no-name.md');
      fs.writeFileSync(agentPath, `---
description: Test agent
---

You are a test agent.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const nameIssue = result.structureIssues.find(i => i.patternId === 'missing_name');
      expect(nameIssue).toBeDefined();
    });

    test('should detect missing description in frontmatter', () => {
      const agentPath = path.join(tempDir, 'no-desc.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
---

You are a test agent.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const descIssue = result.structureIssues.find(i => i.patternId === 'missing_description');
      expect(descIssue).toBeDefined();
    });

    test('should detect unrestricted tools', () => {
      const agentPath = path.join(tempDir, 'unrestricted.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
---

You are a test agent.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const toolsIssue = result.toolIssues.find(i => i.patternId === 'unrestricted_tools');
      expect(toolsIssue).toBeDefined();
      expect(toolsIssue.certainty).toBe('HIGH');
    });

    test('should detect unrestricted Bash', () => {
      const agentPath = path.join(tempDir, 'unrestricted-bash.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read, Bash, Grep
---

You are a test agent.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const bashIssue = result.toolIssues.find(i => i.patternId === 'unrestricted_bash');
      expect(bashIssue).toBeDefined();
      expect(bashIssue.certainty).toBe('HIGH');
    });

    test('should not flag restricted Bash', () => {
      const agentPath = path.join(tempDir, 'restricted-bash.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read, Bash(git:*), Grep
---

You are a test agent.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const bashIssue = result.toolIssues.find(i => i.patternId === 'unrestricted_bash');
      expect(bashIssue).toBeUndefined();
    });

    test('should detect missing role definition', () => {
      const agentPath = path.join(tempDir, 'no-role.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

This agent does things.

## Output Format

Return JSON.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const roleIssue = result.structureIssues.find(i => i.patternId === 'missing_role');
      expect(roleIssue).toBeDefined();
    });

    test('should not flag "You are" role definition', () => {
      const agentPath = path.join(tempDir, 'has-role.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a helpful assistant.

## Output Format

Return JSON.

## Constraints

Do not do bad things.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const roleIssue = result.structureIssues.find(i => i.patternId === 'missing_role');
      expect(roleIssue).toBeUndefined();
    });

    test('should detect missing output format', () => {
      const agentPath = path.join(tempDir, 'no-output.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a test agent.

## Constraints

Stay focused.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const outputIssue = result.structureIssues.find(i => i.patternId === 'missing_output_format');
      expect(outputIssue).toBeDefined();
    });

    test('should detect missing constraints', () => {
      const agentPath = path.join(tempDir, 'no-constraints.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a test agent.

## Output Format

Return JSON.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const constraintIssue = result.structureIssues.find(i => i.patternId === 'missing_constraints');
      expect(constraintIssue).toBeDefined();
    });

    test('should detect vague instructions', () => {
      const agentPath = path.join(tempDir, 'vague.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a test agent.

You should usually do this, sometimes do that, and often try to do the other.
Maybe you could do something. You might want to consider things.

## Format

Return text.

## Rules

Stay focused.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const vagueIssue = result.antiPatternIssues.find(i => i.patternId === 'vague_instructions');
      expect(vagueIssue).toBeDefined();
      expect(vagueIssue.certainty).toBe('MEDIUM');
    });

    test('should detect hardcoded .claude/ directory', () => {
      const agentPath = path.join(tempDir, 'hardcoded.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a test agent. Save state to .claude/state.json.

## Format

Return JSON.

## Constraints

Stay focused.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const cpIssue = result.crossPlatformIssues.find(i => i.patternId === 'hardcoded_claude_dir');
      expect(cpIssue).toBeDefined();
      expect(cpIssue.certainty).toBe('HIGH');
    });

    test('should not flag AI_STATE_DIR usage', () => {
      const agentPath = path.join(tempDir, 'env-var.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a test agent. Use AI_STATE_DIR for .claude/ path.

## Format

Return JSON.

## Constraints

Stay focused.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const cpIssue = result.crossPlatformIssues.find(i => i.patternId === 'hardcoded_claude_dir');
      expect(cpIssue).toBeUndefined();
    });

    test('should detect CLAUDE.md without AGENTS.md mention', () => {
      const agentPath = path.join(tempDir, 'claude-only.md');
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a test agent. Read CLAUDE.md for instructions.

## Format

Return text.

## Constraints

Stay focused.`);

      const result = agentAnalyzer.analyzeAgent(agentPath);

      const mdIssue = result.crossPlatformIssues.find(i => i.patternId === 'claude_md_reference');
      expect(mdIssue).toBeDefined();
    });

    test('should include LOW certainty issues in verbose mode', () => {
      const agentPath = path.join(tempDir, 'verbose-test.md');
      // Create a long prompt to trigger prompt_bloat
      const longContent = 'This is content. '.repeat(600);
      fs.writeFileSync(agentPath, `---
name: test-agent
description: Test agent
tools: Read
---

You are a test agent.

${longContent}

## Format

Return text.

## Constraints

Stay focused.`);

      const resultNormal = agentAnalyzer.analyzeAgent(agentPath, { verbose: false });
      const resultVerbose = agentAnalyzer.analyzeAgent(agentPath, { verbose: true });

      // Verbose mode should have more issues
      const normalTotal = Object.values(resultNormal).filter(Array.isArray).flat().length;
      const verboseTotal = Object.values(resultVerbose).filter(Array.isArray).flat().length;

      expect(verboseTotal).toBeGreaterThanOrEqual(normalTotal);
    });
  });

  describe('analyzeAllAgents', () => {
    test('should analyze multiple agents', () => {
      const agentsDir = path.join(tempDir, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });

      fs.writeFileSync(path.join(agentsDir, 'agent-a.md'), `---
name: agent-a
description: Agent A
tools: Read
---

You are agent A.

## Format

Return text.

## Rules

Stay focused.`);

      fs.writeFileSync(path.join(agentsDir, 'agent-b.md'), `---
name: agent-b
description: Agent B
tools: Grep
---

You are agent B.

## Format

Return text.

## Rules

Stay focused.`);

      const results = agentAnalyzer.analyzeAllAgents(agentsDir);

      expect(results.length).toBe(2);
      expect(results.map(r => r.agentName)).toContain('agent-a');
      expect(results.map(r => r.agentName)).toContain('agent-b');
    });

    test('should skip README.md', () => {
      const agentsDir = path.join(tempDir, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });

      fs.writeFileSync(path.join(agentsDir, 'real-agent.md'), `---
name: real-agent
description: A real agent
---

You are a real agent.`);

      fs.writeFileSync(path.join(agentsDir, 'README.md'), '# Agents\n\nDocumentation.');

      const results = agentAnalyzer.analyzeAllAgents(agentsDir);

      expect(results.length).toBe(1);
      expect(results[0].agentName).toBe('real-agent');
    });

    test('should return empty array for non-existent directory', () => {
      const results = agentAnalyzer.analyzeAllAgents('/nonexistent/path');
      expect(results).toEqual([]);
    });
  });

  describe('applyFixes', () => {
    test('should collect all issues from results array', () => {
      const results = [
        {
          agentName: 'agent-a',
          structureIssues: [{ issue: 'test1', certainty: 'HIGH', patternId: 'missing_frontmatter', file: '/path/a.md' }],
          toolIssues: [],
          xmlIssues: [],
          cotIssues: [],
          exampleIssues: [],
          antiPatternIssues: [],
          crossPlatformIssues: []
        }
      ];

      // Just test that it doesn't throw
      const fixResults = agentAnalyzer.applyFixes(results, { dryRun: true });
      expect(fixResults).toBeDefined();
    });
  });

  describe('generateReport', () => {
    test('should generate report for single agent', () => {
      const results = {
        agentName: 'test-agent',
        agentPath: '/path/to/test-agent.md',
        frontmatter: { name: 'test-agent' },
        structureIssues: [{ issue: 'Missing role', certainty: 'HIGH' }],
        toolIssues: [],
        xmlIssues: [],
        cotIssues: [],
        exampleIssues: [],
        antiPatternIssues: [],
        crossPlatformIssues: []
      };

      const report = agentAnalyzer.generateReport(results);

      expect(report).toContain('test-agent');
      expect(typeof report).toBe('string');
    });

    test('should generate summary for multiple agents', () => {
      const results = [
        {
          agentName: 'agent-a',
          agentPath: '/path/a.md',
          structureIssues: [{ certainty: 'HIGH' }],
          toolIssues: [],
          xmlIssues: [],
          cotIssues: [],
          exampleIssues: [],
          antiPatternIssues: [],
          crossPlatformIssues: []
        },
        {
          agentName: 'agent-b',
          agentPath: '/path/b.md',
          structureIssues: [],
          toolIssues: [{ certainty: 'MEDIUM' }],
          xmlIssues: [],
          cotIssues: [],
          exampleIssues: [],
          antiPatternIssues: [],
          crossPlatformIssues: []
        }
      ];

      const report = agentAnalyzer.generateReport(results);

      expect(report).toContain('agent-a');
      expect(report).toContain('agent-b');
    });
  });
});

describe('Plugin Patterns', () => {
  describe('missing_additional_properties', () => {
    const pattern = pluginPatterns.missing_additional_properties;

    test('should detect missing additionalProperties', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const result = pattern.check(schema);

      expect(result).not.toBeNull();
      expect(result.issue).toContain('additionalProperties');
    });

    test('should not flag when additionalProperties is present', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: false
      };

      const result = pattern.check(schema);
      expect(result).toBeNull();
    });

    test('should handle null/invalid input', () => {
      expect(pattern.check(null)).toBeNull();
      expect(pattern.check(undefined)).toBeNull();
      expect(pattern.check('string')).toBeNull();
    });
  });

  describe('deep_nesting', () => {
    const pattern = pluginPatterns.deep_nesting;

    test('should detect deeply nested schema', () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: { type: 'string' }
                }
              }
            }
          }
        }
      };

      const result = pattern.check(schema);

      expect(result).not.toBeNull();
      expect(result.issue).toContain('nested');
    });

    test('should allow 2 levels of nesting', () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: { type: 'string' }
            }
          }
        }
      };

      const result = pattern.check(schema);
      expect(result).toBeNull();
    });
  });

  describe('version_mismatch', () => {
    const pattern = pluginPatterns.version_mismatch;

    test('should detect version mismatch', () => {
      const pluginJson = { version: '1.0.0' };
      const packageJson = { version: '2.0.0' };

      const result = pattern.check(pluginJson, packageJson);

      expect(result).not.toBeNull();
      expect(result.issue).toContain('1.0.0');
      expect(result.issue).toContain('2.0.0');
    });

    test('should not flag matching versions', () => {
      const pluginJson = { version: '1.0.0' };
      const packageJson = { version: '1.0.0' };

      const result = pattern.check(pluginJson, packageJson);
      expect(result).toBeNull();
    });
  });
});

describe('Agent Patterns', () => {
  describe('getAllPatterns', () => {
    test('should return all patterns', () => {
      const patterns = getAllPatterns();
      expect(Object.keys(patterns).length).toBeGreaterThan(10);
    });
  });

  describe('getPatternsByCertainty', () => {
    test('should filter HIGH certainty patterns', () => {
      const highPatterns = getPatternsByCertainty('HIGH');

      for (const pattern of Object.values(highPatterns)) {
        expect(pattern.certainty).toBe('HIGH');
      }
    });

    test('should filter MEDIUM certainty patterns', () => {
      const mediumPatterns = getPatternsByCertainty('MEDIUM');

      for (const pattern of Object.values(mediumPatterns)) {
        expect(pattern.certainty).toBe('MEDIUM');
      }
    });

    test('should filter LOW certainty patterns', () => {
      const lowPatterns = getPatternsByCertainty('LOW');

      for (const pattern of Object.values(lowPatterns)) {
        expect(pattern.certainty).toBe('LOW');
      }
    });
  });

  describe('getPatternsByCategory', () => {
    test('should filter structure patterns', () => {
      const structurePatterns = getPatternsByCategory('structure');

      for (const pattern of Object.values(structurePatterns)) {
        expect(pattern.category).toBe('structure');
      }
      expect(Object.keys(structurePatterns).length).toBeGreaterThan(0);
    });

    test('should filter tool patterns', () => {
      const toolPatterns = getPatternsByCategory('tool');

      for (const pattern of Object.values(toolPatterns)) {
        expect(pattern.category).toBe('tool');
      }
    });

    test('should filter cross-platform patterns', () => {
      const cpPatterns = getPatternsByCategory('cross-platform');

      for (const pattern of Object.values(cpPatterns)) {
        expect(pattern.category).toBe('cross-platform');
      }
      expect(Object.keys(cpPatterns).length).toBeGreaterThan(0);
    });
  });

  describe('getAutoFixablePatterns', () => {
    test('should return only auto-fixable patterns', () => {
      const fixable = getAutoFixablePatterns();

      for (const pattern of Object.values(fixable)) {
        expect(pattern.autoFix).toBe(true);
      }
      expect(Object.keys(fixable).length).toBeGreaterThan(0);
    });
  });

  describe('pattern checks', () => {
    describe('missing_frontmatter', () => {
      const pattern = agentPatterns.missing_frontmatter;

      test('should detect missing frontmatter', () => {
        const content = '# Agent\n\nNo frontmatter here.';
        const result = pattern.check(content);
        expect(result).not.toBeNull();
      });

      test('should not flag existing frontmatter', () => {
        const content = '---\nname: test\n---\n\nBody';
        const result = pattern.check(content);
        expect(result).toBeNull();
      });
    });

    describe('unrestricted_bash', () => {
      const pattern = agentPatterns.unrestricted_bash;

      test('should detect plain Bash in tools', () => {
        const frontmatter = { tools: 'Read, Bash, Grep' };
        const result = pattern.check(frontmatter);
        expect(result).not.toBeNull();
      });

      test('should detect Bash in array tools', () => {
        const frontmatter = { tools: ['Read', 'Bash', 'Grep'] };
        const result = pattern.check(frontmatter);
        expect(result).not.toBeNull();
      });

      test('should not flag Bash with scope', () => {
        const frontmatter = { tools: 'Read, Bash(git:*), Grep' };
        const result = pattern.check(frontmatter);
        expect(result).toBeNull();
      });
    });

    describe('unnecessary_cot', () => {
      const pattern = agentPatterns.unnecessary_cot;

      test('should detect step-by-step on short prompt', () => {
        const content = `You are an agent.

Think step-by-step about this simple task.

## Format
Return text.`;

        const result = pattern.check(content);
        expect(result).not.toBeNull();
      });

      test('should not flag step-by-step on complex prompt', () => {
        // Create a long, complex prompt
        const content = `You are a complex agent.

${Array(200).fill('This is complex reasoning content.').join('\n')}

Think step-by-step about this task.

## Section 1
Details

## Section 2
More details

## Section 3
Even more

## Section 4
And more

## Section 5
Final section`;

        const result = pattern.check(content);
        expect(result).toBeNull();
      });
    });

    describe('vague_instructions', () => {
      const pattern = agentPatterns.vague_instructions;

      test('should detect multiple vague words', () => {
        const content = 'You usually should try to do this. Sometimes you might want to do that. Often it could be better.';
        const result = pattern.check(content);
        expect(result).not.toBeNull();
      });

      test('should not flag content with few vague words', () => {
        const content = 'You must do this. You shall not do that. Always be precise.';
        const result = pattern.check(content);
        expect(result).toBeNull();
      });
    });

    describe('prompt_bloat', () => {
      const pattern = agentPatterns.prompt_bloat;

      test('should detect prompts over 2000 tokens', () => {
        // ~2500 tokens (10000+ chars)
        const content = 'word '.repeat(2500);
        const result = pattern.check(content);
        expect(result).not.toBeNull();
        expect(result.issue).toContain('tokens');
      });

      test('should not flag short prompts', () => {
        const content = 'A short prompt with not many tokens.';
        const result = pattern.check(content);
        expect(result).toBeNull();
      });
    });
  });
});

describe('Index Exports', () => {
  test('should export plugin analyzer', () => {
    const enhance = require('../lib/enhance');
    expect(enhance.pluginAnalyzer).toBeDefined();
    expect(enhance.analyzePlugin).toBeDefined();
    expect(enhance.analyzeAllPlugins).toBeDefined();
  });

  test('should export agent analyzer', () => {
    const enhance = require('../lib/enhance');
    expect(enhance.agentAnalyzer).toBeDefined();
    expect(enhance.analyzeAgent).toBeDefined();
    expect(enhance.analyzeAllAgents).toBeDefined();
  });

  test('should export pattern modules', () => {
    const enhance = require('../lib/enhance');
    expect(enhance.pluginPatterns).toBeDefined();
    expect(enhance.agentPatterns).toBeDefined();
  });

  test('should export fixer', () => {
    const enhance = require('../lib/enhance');
    expect(enhance.fixer).toBeDefined();
    expect(enhance.fixer.applyFixes).toBeDefined();
    expect(enhance.fixer.fixAdditionalProperties).toBeDefined();
  });

  test('should export reporter', () => {
    const enhance = require('../lib/enhance');
    expect(enhance.reporter).toBeDefined();
    expect(enhance.generateReport).toBeDefined();
  });
});
