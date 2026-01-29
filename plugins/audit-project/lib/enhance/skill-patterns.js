/**
 * Skill patterns for /enhance.
 */

const skillPatterns = {
  missing_frontmatter: {
    id: 'missing_frontmatter',
    certainty: 'HIGH',
    check(content) {
      if (!content || !content.trim().startsWith('---')) {
        return { issue: 'Missing YAML frontmatter in SKILL.md' };
      }
      return null;
    }
  },
  missing_name: {
    id: 'missing_name',
    certainty: 'HIGH',
    check(frontmatter) {
      if (!frontmatter || !frontmatter.name) {
        return { issue: 'Missing name in SKILL.md frontmatter' };
      }
      return null;
    }
  },
  missing_description: {
    id: 'missing_description',
    certainty: 'HIGH',
    check(frontmatter) {
      if (!frontmatter || !frontmatter.description) {
        return { issue: 'Missing description in SKILL.md frontmatter' };
      }
      return null;
    }
  },
  missing_trigger_phrase: {
    id: 'missing_trigger_phrase',
    certainty: 'MEDIUM',
    check(frontmatter) {
      if (!frontmatter || !frontmatter.description) return null;
      if (!/use when user asks/i.test(frontmatter.description)) {
        return { issue: 'Description missing "Use when user asks" trigger phrase' };
      }
      return null;
    }
  }
};

module.exports = {
  skillPatterns
};
