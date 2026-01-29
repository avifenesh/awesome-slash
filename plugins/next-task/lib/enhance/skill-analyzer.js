/**
 * Skill analyzer for /enhance.
 */

const fs = require('fs');
const path = require('path');
const { skillPatterns } = require('./skill-patterns');
const { parseMarkdownFrontmatter } = require('./agent-analyzer');

function analyzeSkill(skillPath) {
  const results = {
    skillName: path.basename(path.dirname(skillPath)),
    skillPath,
    structureIssues: [],
    triggerIssues: []
  };

  if (!fs.existsSync(skillPath)) {
    results.structureIssues.push({
      issue: 'File not found',
      file: skillPath,
      certainty: 'HIGH',
      patternId: 'file_not_found'
    });
    return results;
  }

  let content = '';
  try {
    content = fs.readFileSync(skillPath, 'utf8');
  } catch (err) {
    results.structureIssues.push({
      issue: `Failed to read file: ${err.message}`,
      file: skillPath,
      certainty: 'HIGH',
      patternId: 'read_error'
    });
    return results;
  }

  const missingFm = skillPatterns.missing_frontmatter.check(content);
  if (missingFm) {
    results.structureIssues.push({
      ...missingFm,
      file: skillPath,
      certainty: skillPatterns.missing_frontmatter.certainty,
      patternId: skillPatterns.missing_frontmatter.id
    });
  }

  const { frontmatter } = parseMarkdownFrontmatter(content);
  const missingName = skillPatterns.missing_name.check(frontmatter);
  if (missingName) {
    results.structureIssues.push({
      ...missingName,
      file: skillPath,
      certainty: skillPatterns.missing_name.certainty,
      patternId: skillPatterns.missing_name.id
    });
  }

  const missingDescription = skillPatterns.missing_description.check(frontmatter);
  if (missingDescription) {
    results.structureIssues.push({
      ...missingDescription,
      file: skillPath,
      certainty: skillPatterns.missing_description.certainty,
      patternId: skillPatterns.missing_description.id
    });
  }

  const missingTrigger = skillPatterns.missing_trigger_phrase.check(frontmatter);
  if (missingTrigger) {
    results.triggerIssues.push({
      ...missingTrigger,
      file: skillPath,
      certainty: skillPatterns.missing_trigger_phrase.certainty,
      patternId: skillPatterns.missing_trigger_phrase.id
    });
  }

  return results;
}

function analyzeAllSkills(skillsDir) {
  const results = [];
  if (!fs.existsSync(skillsDir)) return results;

  const skillFiles = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'target']);

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }

      if (entry.isFile() && entry.name === 'SKILL.md') {
        skillFiles.push(fullPath);
      }
    }
  }

  walk(skillsDir);

  for (const skillPath of skillFiles) {
    results.push(analyzeSkill(skillPath));
  }

  return results;
}

function analyze(options = {}) {
  const {
    skill,
    skillsDir = 'plugins/enhance/skills'
  } = options;

  if (skill) {
    const skillPath = skill.endsWith('SKILL.md')
      ? skill
      : path.join(skillsDir, skill, 'SKILL.md');
    return analyzeSkill(skillPath);
  }

  return analyzeAllSkills(skillsDir);
}

module.exports = {
  analyzeSkill,
  analyzeAllSkills,
  analyze
};
