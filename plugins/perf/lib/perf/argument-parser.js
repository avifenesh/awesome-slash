/**
 * Argument parsing helper for /perf.
 *
 * @module lib/perf/argument-parser
 */

function parseArguments(raw) {
  if (!raw || typeof raw !== 'string') return [];

  const args = [];
  let current = '';
  let quote = null;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      if (quote) {
        escaped = true;
        continue;
      }
    }

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    args.push(current);
  }

  return args;
}

module.exports = {
  parseArguments
};
