/**
 * Cross-File Analyzer Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import modules under test
const crossFilePatterns = require('../../lib/enhance/cross-file-patterns');
const crossFileAnalyzer = require('../../lib/enhance/cross-file-analyzer');

describe('Cross-File Patterns', () => {
  describe('tool_not_in_allowed_list', () => {
    const pattern = crossFilePatterns.crossFilePatterns.tool_not_in_allowed_list;

    it('should detect tool used but not declared', () => {
      const result = pattern.check({
        declaredTools: ['Read', 'Grep'],
        usedTools: ['Read', 'Write', 'Edit'],
        agentName: 'test-agent'
      });

      expect(result).toBeTruthy();
      expect(result.issue).toContain('Write');
      expect(result.issue).toContain('Edit');
    });

    it('should not flag when all tools are declared', () => {
      const result = pattern.check({
        declaredTools: ['Read', 'Grep', 'Write'],
        usedTools: ['Read', 'Write'],
        agentName: 'test-agent'
      });

      expect(result).toBeNull();
    });

    it('should handle scoped Bash declarations', () => {
      const result = pattern.check({
        declaredTools: ['Read', 'Bash(git:*)'],
        usedTools: ['Read', 'Bash'],
        agentName: 'test-agent'
      });

      expect(result).toBeNull();
    });

    it('should skip if no declared tools', () => {
      const result = pattern.check({
        declaredTools: [],
        usedTools: ['Read', 'Write'],
        agentName: 'test-agent'
      });

      expect(result).toBeNull();
    });
  });

  describe('missing_workflow_agent', () => {
    const pattern = crossFilePatterns.crossFilePatterns.missing_workflow_agent;

    it('should detect missing agent reference', () => {
      const result = pattern.check({
        referencedAgent: 'next-task:nonexistent-agent',
        existingAgents: [
          { plugin: 'next-task', name: 'exploration-agent' },
          { plugin: 'enhance', name: 'plugin-enhancer' }
        ],
        sourceFile: 'workflow.md'
      });

      expect(result).toBeTruthy();
      expect(result.issue).toContain('nonexistent-agent');
    });

    it('should not flag existing agent', () => {
      const result = pattern.check({
        referencedAgent: 'next-task:exploration-agent',
        existingAgents: [
          { plugin: 'next-task', name: 'exploration-agent' },
          { plugin: 'enhance', name: 'plugin-enhancer' }
        ],
        sourceFile: 'workflow.md'
      });

      expect(result).toBeNull();
    });
  });

  describe('duplicate_instructions', () => {
    const pattern = crossFilePatterns.crossFilePatterns.duplicate_instructions;

    it('should flag duplicate instructions', () => {
      const result = pattern.check({
        instruction: 'NEVER use git push --force on main branch',
        files: ['agent1.md', 'agent2.md', 'agent3.md']
      });

      expect(result).toBeTruthy();
      expect(result.issue).toContain('3 files');
    });

    it('should not flag single occurrence', () => {
      const result = pattern.check({
        instruction: 'Some instruction',
        files: ['agent1.md']
      });

      expect(result).toBeNull();
    });
  });

  describe('contradictory_rules', () => {
    const pattern = crossFilePatterns.crossFilePatterns.contradictory_rules;

    it('should flag contradictory rules', () => {
      const result = pattern.check({
        rule1: 'ALWAYS commit changes before switching branches',
        rule2: 'NEVER commit changes before review approval',
        file1: 'agent1.md',
        file2: 'agent2.md'
      });

      expect(result).toBeTruthy();
      expect(result.issue).toContain('Contradictory');
    });
  });

  describe('orphaned_prompt', () => {
    const pattern = crossFilePatterns.crossFilePatterns.orphaned_prompt;

    it('should detect orphaned prompt', () => {
      const result = pattern.check({
        promptFile: 'unused-agent.md',
        referencedBy: []
      });

      expect(result).toBeTruthy();
      expect(result.issue).toContain('Orphaned');
    });

    it('should not flag referenced prompt', () => {
      const result = pattern.check({
        promptFile: 'used-agent.md',
        referencedBy: ['workflow.md']
      });

      expect(result).toBeNull();
    });
  });

  describe('skill_tool_mismatch', () => {
    const pattern = crossFilePatterns.crossFilePatterns.skill_tool_mismatch;

    it('should detect skill tool mismatch', () => {
      const result = pattern.check({
        skillName: 'my-skill',
        skillAllowedTools: ['Read', 'Grep'],
        promptUsedTools: ['Read', 'Write', 'Edit']
      });

      expect(result).toBeTruthy();
      expect(result.issue).toContain('Write');
    });

    it('should not flag aligned tools', () => {
      const result = pattern.check({
        skillName: 'my-skill',
        skillAllowedTools: ['Read', 'Grep', 'Write'],
        promptUsedTools: ['Read', 'Write']
      });

      expect(result).toBeNull();
    });
  });
});

describe('Cross-File Analyzer Functions', () => {
  describe('extractToolMentions', () => {
    const knownTools = ['Task', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'];

    it('should extract tool calls', () => {
      const content = `
Use Read({ file_path: "/path" })
Then call Write({ file_path: "/out" })
      `;
      const tools = crossFileAnalyzer.extractToolMentions(content, knownTools);

      expect(tools).toContain('Read');
      expect(tools).toContain('Write');
    });

    it('should extract tool mentions', () => {
      const content = `
Use the Glob tool to find files.
Invoke Task to spawn agents.
      `;
      const tools = crossFileAnalyzer.extractToolMentions(content, knownTools);

      expect(tools).toContain('Glob');
      expect(tools).toContain('Task');
    });

    it('should detect Bash via shell commands', () => {
      const content = `
Run: git status
Then: npm test
      `;
      const tools = crossFileAnalyzer.extractToolMentions(content, knownTools);

      expect(tools).toContain('Bash');
    });

    it('should skip bad-example content', () => {
      const content = `
<bad-example>
Write({ file_path: "/wrong" })
</bad-example>

Read({ file_path: "/correct" })
      `;
      const tools = crossFileAnalyzer.extractToolMentions(content, knownTools);

      expect(tools).toContain('Read');
      expect(tools).not.toContain('Write');
    });
  });

  describe('extractAgentReferences', () => {
    it('should extract subagent_type references', () => {
      const content = `
Task({
  subagent_type: "next-task:exploration-agent",
  prompt: "Explore"
})

await Task({ subagent_type: 'enhance:plugin-enhancer', prompt: 'Enhance' });
      `;
      const refs = crossFileAnalyzer.extractAgentReferences(content);

      expect(refs).toContain('next-task:exploration-agent');
      expect(refs).toContain('enhance:plugin-enhancer');
    });

    it('should return empty array for no references', () => {
      const content = 'No agent references here.';
      const refs = crossFileAnalyzer.extractAgentReferences(content);

      expect(refs).toEqual([]);
    });
  });

  describe('extractCriticalInstructions', () => {
    it('should extract MUST/NEVER instructions', () => {
      const content = `
## Rules

You MUST always validate input.
You should do your best.
NEVER expose credentials.
DO NOT skip tests.
      `;
      const instructions = crossFileAnalyzer.extractCriticalInstructions(content);

      expect(instructions.length).toBe(3);
      expect(instructions.some(i => i.line.includes('MUST'))).toBe(true);
      expect(instructions.some(i => i.line.includes('NEVER'))).toBe(true);
      expect(instructions.some(i => i.line.includes('DO NOT'))).toBe(true);
    });

    it('should skip headers and code blocks', () => {
      const content = `
# MUST Header

\`\`\`
NEVER in code block
\`\`\`

MUST catch this one.
      `;
      const instructions = crossFileAnalyzer.extractCriticalInstructions(content);

      expect(instructions.length).toBe(1);
      expect(instructions[0].line).toContain('catch this one');
    });
  });
});

describe('Cross-File Pattern Helpers', () => {
  describe('getAllPatterns', () => {
    it('should return all patterns', () => {
      const patterns = crossFilePatterns.getAllPatterns();
      expect(Object.keys(patterns).length).toBeGreaterThan(0);
    });
  });

  describe('getPatternsByCategory', () => {
    it('should filter by category', () => {
      const toolPatterns = crossFilePatterns.getPatternsByCategory('tool-consistency');
      expect(Object.keys(toolPatterns).length).toBeGreaterThan(0);

      for (const pattern of Object.values(toolPatterns)) {
        expect(pattern.category).toBe('tool-consistency');
      }
    });
  });

  describe('getPatternsByCertainty', () => {
    it('should filter by certainty', () => {
      const mediumPatterns = crossFilePatterns.getPatternsByCertainty('MEDIUM');
      expect(Object.keys(mediumPatterns).length).toBeGreaterThan(0);

      for (const pattern of Object.values(mediumPatterns)) {
        expect(pattern.certainty).toBe('MEDIUM');
      }
    });
  });

  describe('loadKnownTools', () => {
    it('should return platform defaults without config file', () => {
      const tools = crossFilePatterns.loadKnownTools('/nonexistent/path');
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration - Real Plugin Analysis', () => {
  const rootDir = path.resolve(__dirname, '../..');

  it('should load agents from plugins directory', () => {
    const agents = crossFileAnalyzer.loadAllAgents(rootDir);

    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toHaveProperty('plugin');
    expect(agents[0]).toHaveProperty('name');
    expect(agents[0]).toHaveProperty('frontmatter');
    expect(agents[0]).toHaveProperty('body');
  });

  it('should load skills from plugins directory', () => {
    const skills = crossFileAnalyzer.loadAllSkills(rootDir);

    expect(skills.length).toBeGreaterThan(0);
    expect(skills[0]).toHaveProperty('plugin');
    expect(skills[0]).toHaveProperty('name');
  });

  it('should run full cross-file analysis', () => {
    const results = crossFileAnalyzer.analyze(rootDir, { verbose: true });

    expect(results).toHaveProperty('findings');
    expect(results).toHaveProperty('summary');
    expect(results.summary.agentsAnalyzed).toBeGreaterThan(0);
    expect(results.summary.skillsAnalyzed).toBeGreaterThan(0);
  });
});
