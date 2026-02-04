/**
 * Cross-File Semantic Analyzer
 * Analyzes relationships between agents, skills, and workflows
 *
 * Cross-platform compatible: Works with Claude Code, OpenCode, and Codex
 *
 * @author Avi Fenesh
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const { parseMarkdownFrontmatter } = require('./agent-analyzer');
const { crossFilePatterns, loadKnownTools } = require('./cross-file-patterns');

/**
 * Extract tool mentions from prompt content
 * Detects tool usage patterns in prompt body
 * @param {string} content - Prompt content
 * @param {string[]} knownTools - List of known tool names
 * @returns {string[]} Array of tool names found
 */
function extractToolMentions(content, knownTools) {
  if (!content || typeof content !== 'string') return [];

  const found = new Set();

  // Skip content inside bad-example tags and code blocks with "bad" in info string
  const cleanContent = content
    .replace(/<bad[- ]?example>[\s\S]*?<\/bad[- ]?example>/gi, '')
    .replace(/```[^\n]*bad[^\n]*\n[\s\S]*?```/gi, '');

  for (const tool of knownTools) {
    // Pattern 1: Tool({ or Tool(
    const callPattern = new RegExp(`\\b${tool}\\s*\\(`, 'g');
    if (callPattern.test(cleanContent)) {
      found.add(tool);
      continue;
    }

    // Pattern 2: "use the Tool tool" or "invoke Tool"
    const mentionPattern = new RegExp(`\\b(?:use|invoke|call|with)\\s+(?:the\\s+)?${tool}\\b`, 'gi');
    if (mentionPattern.test(cleanContent)) {
      found.add(tool);
      continue;
    }

    // Pattern 3: Tool tool (e.g., "Read tool", "Bash tool")
    const toolNounPattern = new RegExp(`\\b${tool}\\s+tool\\b`, 'gi');
    if (toolNounPattern.test(cleanContent)) {
      found.add(tool);
    }
  }

  // Special case: Bash detection via shell commands
  if (!found.has('Bash') && !found.has('Shell')) {
    const shellPatterns = [
      /\bgit\s+(?:add|commit|push|pull|branch|checkout|merge|rebase|status|diff|log)\b/i,
      /\bnpm\s+(?:install|test|run|build|publish)\b/i,
      /\bpnpm\s+/i,
      /\byarn\s+/i,
      /\bcargo\s+/i,
      /\bgo\s+(?:build|test|run|mod)\b/i
    ];
    for (const pattern of shellPatterns) {
      if (pattern.test(cleanContent)) {
        found.add('Bash');
        break;
      }
    }
  }

  return Array.from(found);
}

/**
 * Extract agent references from content
 * Finds subagent_type references in Task() calls
 * @param {string} content - Content to scan
 * @returns {string[]} Array of referenced agent names (plugin:agent format)
 */
function extractAgentReferences(content) {
  if (!content || typeof content !== 'string') return [];

  const references = new Set();

  // Pattern: subagent_type: "plugin:agent" or subagent_type: 'plugin:agent'
  const subagentPattern = /subagent_type\s*[=:]\s*["']([^"']+)["']/g;
  let match;
  while ((match = subagentPattern.exec(content)) !== null) {
    references.add(match[1]);
  }

  return Array.from(references);
}

/**
 * Extract critical instructions (lines with MUST, NEVER, always, etc.)
 * @param {string} content - Content to scan
 * @returns {Array<{line: string, lineNumber: number}>} Critical instructions
 */
function extractCriticalInstructions(content) {
  if (!content || typeof content !== 'string') return [];

  const instructions = [];
  const lines = content.split('\n');
  let inCodeBlock = false;

  const criticalPatterns = [
    /\bMUST\b/,
    /\bNEVER\b/,
    /\bALWAYS\b/i,
    /\bREQUIRED\b/i,
    /\bFORBIDDEN\b/i,
    /\bCRITICAL\b/i,
    /\bDO NOT\b/i,
    /\bdon't\b/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track code block state
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip empty lines, headers, and content inside code blocks
    if (!line || line.startsWith('#') || inCodeBlock) continue;

    for (const pattern of criticalPatterns) {
      if (pattern.test(line)) {
        instructions.push({ line, lineNumber: i + 1 });
        break;
      }
    }
  }

  return instructions;
}

/**
 * Load all agent files from a directory structure
 * @param {string} rootDir - Root directory to scan
 * @returns {Array<Object>} Array of parsed agent objects
 */
function loadAllAgents(rootDir) {
  const agents = [];

  // Find plugins directory
  const pluginsDir = path.join(rootDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) return agents;

  // Scan each plugin for agents
  const plugins = fs.readdirSync(pluginsDir).filter(f => {
    const fullPath = path.join(pluginsDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const plugin of plugins) {
    const agentsDir = path.join(pluginsDir, plugin, 'agents');
    if (!fs.existsSync(agentsDir)) continue;

    const agentFiles = fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md');

    for (const agentFile of agentFiles) {
      const agentPath = path.join(agentsDir, agentFile);
      try {
        const content = fs.readFileSync(agentPath, 'utf8');
        const { frontmatter, body } = parseMarkdownFrontmatter(content);

        agents.push({
          plugin,
          name: agentFile.replace('.md', ''),
          path: agentPath,
          frontmatter: frontmatter || {},
          body,
          content
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return agents;
}

/**
 * Load all skill files from a directory structure
 * @param {string} rootDir - Root directory to scan
 * @returns {Array<Object>} Array of parsed skill objects
 */
function loadAllSkills(rootDir) {
  const skills = [];

  // Find plugins directory
  const pluginsDir = path.join(rootDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) return skills;

  // Scan each plugin for skills
  const plugins = fs.readdirSync(pluginsDir).filter(f => {
    const fullPath = path.join(pluginsDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const plugin of plugins) {
    const skillsDir = path.join(pluginsDir, plugin, 'skills');
    if (!fs.existsSync(skillsDir)) continue;

    // Skills are in subdirectories with SKILL.md
    const skillDirs = fs.readdirSync(skillsDir).filter(f => {
      const fullPath = path.join(skillsDir, f);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const skillDir of skillDirs) {
      const skillPath = path.join(skillsDir, skillDir, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      try {
        const content = fs.readFileSync(skillPath, 'utf8');
        const { frontmatter, body } = parseMarkdownFrontmatter(content);

        skills.push({
          plugin,
          name: skillDir,
          path: skillPath,
          frontmatter: frontmatter || {},
          body,
          content
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return skills;
}

/**
 * Analyze tool consistency between frontmatter and body
 * @param {Array<Object>} agents - Parsed agents
 * @param {string[]} knownTools - Known tool names
 * @returns {Array<Object>} Findings
 */
function analyzeToolConsistency(agents, knownTools) {
  const findings = [];
  const pattern = crossFilePatterns.tool_not_in_allowed_list;

  for (const agent of agents) {
    const { frontmatter, body, name, path: agentPath } = agent;

    // Get declared tools from frontmatter
    let declaredTools = [];
    if (frontmatter && frontmatter.tools) {
      declaredTools = Array.isArray(frontmatter.tools)
        ? frontmatter.tools
        : frontmatter.tools.split(',').map(t => t.trim());
    }

    // Skip if no tools restriction (all tools allowed)
    if (declaredTools.length === 0) continue;

    // Extract used tools from body
    const usedTools = extractToolMentions(body, knownTools);

    const result = pattern.check({
      declaredTools,
      usedTools,
      agentName: name
    });

    if (result) {
      findings.push({
        ...result,
        file: agentPath,
        certainty: pattern.certainty,
        patternId: pattern.id,
        source: 'cross-file'
      });
    }
  }

  return findings;
}

/**
 * Analyze workflow completeness (referenced agents exist)
 * @param {Array<Object>} agents - Parsed agents
 * @returns {Array<Object>} Findings
 */
function analyzeWorkflowCompleteness(agents) {
  const findings = [];
  const pattern = crossFilePatterns.missing_workflow_agent;

  // Build list of existing agents
  const existingAgents = agents.map(a => ({
    plugin: a.plugin,
    name: a.name
  }));

  // Check each agent for references to other agents
  for (const agent of agents) {
    const { body, path: agentPath } = agent;
    const references = extractAgentReferences(body);

    for (const ref of references) {
      const result = pattern.check({
        referencedAgent: ref,
        existingAgents,
        sourceFile: path.basename(agentPath)
      });

      if (result) {
        findings.push({
          ...result,
          file: agentPath,
          certainty: pattern.certainty,
          patternId: pattern.id,
          source: 'cross-file'
        });
      }
    }
  }

  return findings;
}

/**
 * Analyze prompt consistency (duplicates, contradictions)
 * @param {Array<Object>} agents - Parsed agents
 * @returns {Array<Object>} Findings
 */
function analyzePromptConsistency(agents) {
  const findings = [];

  // Collect all critical instructions with their sources
  const instructionMap = new Map(); // instruction -> [files]

  for (const agent of agents) {
    const instructions = extractCriticalInstructions(agent.body);

    for (const { line } of instructions) {
      // Normalize instruction for comparison
      const normalized = line.toLowerCase().trim();
      if (normalized.length < 20) continue; // Skip very short lines

      if (!instructionMap.has(normalized)) {
        instructionMap.set(normalized, []);
      }
      instructionMap.get(normalized).push(agent.path);
    }
  }

  // Find duplicates
  const duplicatePattern = crossFilePatterns.duplicate_instructions;
  for (const [instruction, files] of instructionMap) {
    if (files.length >= 3) { // Only flag if in 3+ files
      const result = duplicatePattern.check({ instruction, files });
      if (result) {
        findings.push({
          ...result,
          file: files[0],
          certainty: duplicatePattern.certainty,
          patternId: duplicatePattern.id,
          source: 'cross-file'
        });
      }
    }
  }

  // Find contradictions (always vs never for same action)
  const contradictionPattern = crossFilePatterns.contradictory_rules;
  const alwaysRules = [];
  const neverRules = [];

  for (const agent of agents) {
    const instructions = extractCriticalInstructions(agent.body);

    for (const { line } of instructions) {
      if (/\bALWAYS\b/i.test(line)) {
        alwaysRules.push({ line, file: agent.path });
      }
      if (/\bNEVER\b/i.test(line) || /\bDO NOT\b/i.test(line)) {
        neverRules.push({ line, file: agent.path });
      }
    }
  }

  // Check for potential contradictions
  for (const always of alwaysRules) {
    for (const never of neverRules) {
      // Skip if same file
      if (always.file === never.file) continue;

      // Extract the action (words after ALWAYS/NEVER)
      const alwaysAction = always.line.replace(/.*\bALWAYS\b\s*/i, '').substring(0, 30);
      const neverAction = never.line.replace(/.*\b(?:NEVER|DO NOT)\b\s*/i, '').substring(0, 30);

      // Simple similarity check
      const similarity = calculateSimilarity(alwaysAction.toLowerCase(), neverAction.toLowerCase());
      if (similarity > 0.6) {
        const result = contradictionPattern.check({
          rule1: always.line,
          rule2: never.line,
          file1: path.basename(always.file),
          file2: path.basename(never.file)
        });

        if (result) {
          findings.push({
            ...result,
            file: always.file,
            certainty: contradictionPattern.certainty,
            patternId: contradictionPattern.id,
            source: 'cross-file'
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Calculate simple string similarity (Jaccard index on words)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score 0-1
 */
function calculateSimilarity(a, b) {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

/**
 * Analyze skill-agent alignment
 * @param {Array<Object>} skills - Parsed skills
 * @param {string[]} knownTools - Known tool names
 * @returns {Array<Object>} Findings
 */
function analyzeSkillAlignment(skills, knownTools) {
  const findings = [];
  const pattern = crossFilePatterns.skill_tool_mismatch;

  for (const skill of skills) {
    const { frontmatter, body, name, path: skillPath } = skill;

    // Get allowed-tools from frontmatter
    let allowedTools = [];
    const toolsField = frontmatter['allowed-tools'] || frontmatter.allowedTools || frontmatter.tools;
    if (toolsField) {
      allowedTools = Array.isArray(toolsField)
        ? toolsField
        : toolsField.split(',').map(t => t.trim());
    }

    // Skip if no tools restriction
    if (allowedTools.length === 0) continue;

    // Extract used tools from body
    const usedTools = extractToolMentions(body, knownTools);

    const result = pattern.check({
      skillName: name,
      skillAllowedTools: allowedTools,
      promptUsedTools: usedTools
    });

    if (result) {
      findings.push({
        ...result,
        file: skillPath,
        certainty: pattern.certainty,
        patternId: pattern.id,
        source: 'cross-file'
      });
    }
  }

  return findings;
}

/**
 * Find orphaned agents (not referenced anywhere)
 * @param {Array<Object>} agents - Parsed agents
 * @param {Array<Object>} skills - Parsed skills
 * @returns {Array<Object>} Findings
 */
function analyzeOrphanedPrompts(agents, skills) {
  const findings = [];
  const pattern = crossFilePatterns.orphaned_prompt;

  // Collect all agent references
  const allReferences = new Set();

  // From agents
  for (const agent of agents) {
    const refs = extractAgentReferences(agent.body);
    refs.forEach(r => allReferences.add(r));
  }

  // From skills
  for (const skill of skills) {
    const refs = extractAgentReferences(skill.body);
    refs.forEach(r => allReferences.add(r));
  }

  // Check each agent
  for (const agent of agents) {
    const fullName = `${agent.plugin}:${agent.name}`;
    const shortName = agent.name;

    // Check if referenced
    const isReferenced = allReferences.has(fullName) || allReferences.has(shortName);

    // Some agents are entry points (orchestrators, discoverers) - skip them
    const isEntryPoint = /orchestrator|discoverer|validator|monitor/i.test(agent.name);

    if (!isReferenced && !isEntryPoint) {
      const result = pattern.check({
        promptFile: path.basename(agent.path),
        referencedBy: []
      });

      if (result) {
        findings.push({
          ...result,
          file: agent.path,
          certainty: pattern.certainty,
          patternId: pattern.id,
          source: 'cross-file'
        });
      }
    }
  }

  return findings;
}

/**
 * Main cross-file analysis function
 * @param {string} rootDir - Root directory to analyze
 * @param {Object} options - Analysis options
 * @param {boolean} options.verbose - Include all findings
 * @param {string[]} options.categories - Specific categories to check
 * @returns {Object} Analysis results
 */
function analyze(rootDir, options = {}) {
  const {
    verbose = false,
    categories = ['tool-consistency', 'workflow', 'consistency', 'skill-alignment']
  } = options;

  const results = {
    rootDir,
    findings: [],
    summary: {
      agentsAnalyzed: 0,
      skillsAnalyzed: 0,
      totalFindings: 0,
      byCategory: {}
    }
  };

  // Load known tools (config file or platform defaults)
  const knownTools = loadKnownTools(rootDir);

  // Load all agents and skills
  const agents = loadAllAgents(rootDir);
  const skills = loadAllSkills(rootDir);

  results.summary.agentsAnalyzed = agents.length;
  results.summary.skillsAnalyzed = skills.length;

  // Run analysis for each category
  if (categories.includes('tool-consistency')) {
    const toolFindings = analyzeToolConsistency(agents, knownTools);
    results.findings.push(...toolFindings);
    results.summary.byCategory['tool-consistency'] = toolFindings.length;
  }

  if (categories.includes('workflow')) {
    const workflowFindings = analyzeWorkflowCompleteness(agents);
    results.findings.push(...workflowFindings);
    results.summary.byCategory['workflow'] = workflowFindings.length;
  }

  if (categories.includes('consistency')) {
    const consistencyFindings = analyzePromptConsistency(agents);
    const orphanFindings = analyzeOrphanedPrompts(agents, skills);
    results.findings.push(...consistencyFindings, ...orphanFindings);
    results.summary.byCategory['consistency'] = consistencyFindings.length + orphanFindings.length;
  }

  if (categories.includes('skill-alignment')) {
    const skillFindings = analyzeSkillAlignment(skills, knownTools);
    results.findings.push(...skillFindings);
    results.summary.byCategory['skill-alignment'] = skillFindings.length;
  }

  results.summary.totalFindings = results.findings.length;

  return results;
}

module.exports = {
  extractToolMentions,
  extractAgentReferences,
  extractCriticalInstructions,
  loadAllAgents,
  loadAllSkills,
  analyzeToolConsistency,
  analyzeWorkflowCompleteness,
  analyzePromptConsistency,
  analyzeSkillAlignment,
  analyzeOrphanedPrompts,
  analyze
};
