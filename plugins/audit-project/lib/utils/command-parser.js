/**
 * Command parsing helpers for shell-free process execution.
 *
 * @module lib/utils/command-parser
 */

'use strict';

const WINDOWS_CMD_SHIMS = new Set(['npm', 'npx', 'pnpm', 'yarn', 'yarnpkg', 'corepack']);

function assertValidToken(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  if (value.includes('\0')) {
    throw new Error(`${label} contains invalid null byte`);
  }
}

function resolveExecutableForPlatform(executable, platform = process.platform) {
  assertValidToken(executable, 'Executable');

  if (platform !== 'win32') {
    return executable;
  }

  if (executable.includes('/') || executable.includes('\\')) {
    return executable;
  }

  if (/\.[a-zA-Z0-9]+$/.test(executable)) {
    return executable;
  }

  return WINDOWS_CMD_SHIMS.has(executable.toLowerCase())
    ? `${executable}.cmd`
    : executable;
}

function tokenize(command) {
  const trimmed = command.trim();
  if (!trimmed) {
    return [];
  }

  const tokens = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (ch === '\\') {
      const next = trimmed[i + 1];

      if (quote === "'") {
        current += ch;
        continue;
      }

      if (quote === '"') {
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          current += next;
          i += 1;
        } else {
          current += ch;
        }
        continue;
      }

      if (next && (/\s/.test(next) || next === '"' || next === "'" || next === '\\')) {
        current += next;
        i += 1;
      } else {
        current += ch;
      }
      continue;
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
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (quote) {
    throw new Error('Command contains unterminated quote');
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

function parseCommand(command, label = 'Command') {
  if (typeof command !== 'string' || command.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  const tokens = tokenize(command);
  if (tokens.length === 0) {
    throw new Error(`${label} must include an executable`);
  }

  const [executable, ...args] = tokens;
  assertValidToken(executable, `${label} executable`);
  for (const arg of args) {
    assertValidToken(arg, `${label} argument`);
  }

  return {
    executable,
    args,
    display: command.trim()
  };
}

module.exports = {
  parseCommand,
  resolveExecutableForPlatform
};
