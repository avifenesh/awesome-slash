/**
 * Tests for shell-escape utility
 *
 * Tests all escaping functions for security-critical shell command construction
 */

const {
  escapeShell,
  escapeSingleQuotes,
  sanitizeExtension,
  escapeDoubleQuotes,
  quoteShell
} = require('../lib/utils/shell-escape');

describe('shell-escape', () => {
  describe('escapeShell', () => {
    it('returns empty string for non-string input', () => {
      expect(escapeShell(null)).toBe('');
      expect(escapeShell(undefined)).toBe('');
      expect(escapeShell(123)).toBe('');
      expect(escapeShell({})).toBe('');
      expect(escapeShell([])).toBe('');
    });

    it('returns unchanged string for safe input', () => {
      expect(escapeShell('hello')).toBe('hello');
      expect(escapeShell('file.txt')).toBe('file.txt');
      expect(escapeShell('path/to/file')).toBe('path/to/file');
    });

    it('throws on null bytes', () => {
      expect(() => escapeShell('foo\x00bar')).toThrow('null bytes');
      expect(() => escapeShell('\x00')).toThrow('null bytes');
    });

    it('throws on newlines', () => {
      expect(() => escapeShell('foo\nbar')).toThrow('newlines');
      expect(() => escapeShell('foo\rbar')).toThrow('newlines');
      expect(() => escapeShell('foo\r\nbar')).toThrow('newlines');
    });

    it('escapes double quotes', () => {
      expect(escapeShell('say "hello"')).toBe('say\\ \\"hello\\"');
    });

    it('escapes dollar signs (command substitution)', () => {
      expect(escapeShell('$HOME')).toBe('\\$HOME');
      expect(escapeShell('$(whoami)')).toBe('\\$\\(whoami\\)');
    });

    it('escapes backticks (command substitution)', () => {
      expect(escapeShell('`whoami`')).toBe('\\`whoami\\`');
    });

    it('escapes backslashes', () => {
      // Colon is not a shell metacharacter, only backslash is escaped
      expect(escapeShell('C:\\path')).toBe('C:\\\\path');
    });

    it('escapes semicolons (command chaining)', () => {
      expect(escapeShell('foo; rm -rf /')).toBe('foo\\;\\ rm\\ -rf\\ /');
    });

    it('escapes pipes (command chaining)', () => {
      expect(escapeShell('foo | cat')).toBe('foo\\ \\|\\ cat');
    });

    it('escapes ampersands (command chaining)', () => {
      expect(escapeShell('foo && bar')).toBe('foo\\ \\&\\&\\ bar');
    });

    it('escapes redirects', () => {
      expect(escapeShell('foo > /etc/passwd')).toBe('foo\\ \\>\\ /etc/passwd');
      expect(escapeShell('foo < /dev/null')).toBe('foo\\ \\<\\ /dev/null');
    });

    it('escapes parentheses (subshells)', () => {
      expect(escapeShell('(cmd)')).toBe('\\(cmd\\)');
    });

    it('escapes braces (brace expansion)', () => {
      expect(escapeShell('{a,b}')).toBe('\\{a,b\\}');
    });

    it('escapes brackets (character classes)', () => {
      expect(escapeShell('[abc]')).toBe('\\[abc\\]');
    });

    it('escapes glob characters', () => {
      expect(escapeShell('*.txt')).toBe('\\*.txt');
      expect(escapeShell('file?.log')).toBe('file\\?.log');
    });

    it('escapes tilde (home directory)', () => {
      expect(escapeShell('~/file')).toBe('\\~/file');
    });

    it('escapes hash (comments)', () => {
      expect(escapeShell('foo #comment')).toBe('foo\\ \\#comment');
    });

    it('escapes single quotes', () => {
      expect(escapeShell("don't")).toBe("don\\'t");
    });

    it('escapes spaces', () => {
      expect(escapeShell('my file.txt')).toBe('my\\ file.txt');
    });

    it('escapes tabs', () => {
      expect(escapeShell('foo\tbar')).toBe('foo\\\tbar');
    });

    it('escapes exclamation marks (history expansion)', () => {
      expect(escapeShell('test!')).toBe('test\\!');
      expect(escapeShell('!!')).toBe('\\!\\!');
    });

    it('handles complex injection attempts', () => {
      // Classic command injection
      expect(escapeShell('$(cat /etc/passwd)')).toBe('\\$\\(cat\\ /etc/passwd\\)');

      // Backtick injection
      expect(escapeShell('`cat /etc/passwd`')).toBe('\\`cat\\ /etc/passwd\\`');

      // Multi-command injection
      expect(escapeShell('foo; rm -rf /')).toBe('foo\\;\\ rm\\ -rf\\ /');

      // Pipe to shell
      expect(escapeShell('echo | sh')).toBe('echo\\ \\|\\ sh');
    });
  });

  describe('escapeSingleQuotes', () => {
    it('returns empty string for non-string input', () => {
      expect(escapeSingleQuotes(null)).toBe('');
      expect(escapeSingleQuotes(undefined)).toBe('');
      expect(escapeSingleQuotes(123)).toBe('');
    });

    it('returns unchanged string without single quotes', () => {
      expect(escapeSingleQuotes('hello')).toBe('hello');
      expect(escapeSingleQuotes('hello world')).toBe('hello world');
    });

    it('escapes single quotes correctly', () => {
      expect(escapeSingleQuotes("don't")).toBe("don'\\''t");
      // Each ' becomes '\'' - the function just replaces ' with '\''
      expect(escapeSingleQuotes("it's a 'test'")).toBe("it'\\''s a '\\''test'\\''");
    });

    it('handles multiple consecutive single quotes', () => {
      expect(escapeSingleQuotes("'''")).toBe("'\\'''\\'''\\''");
    });

    it('handles string starting/ending with single quotes', () => {
      expect(escapeSingleQuotes("'hello'")).toBe("'\\''hello'\\''");
    });
  });

  describe('sanitizeExtension', () => {
    it('returns ts for non-string input', () => {
      expect(sanitizeExtension(null)).toBe('ts');
      expect(sanitizeExtension(undefined)).toBe('ts');
      expect(sanitizeExtension(123)).toBe('ts');
    });

    it('returns ts for empty string', () => {
      expect(sanitizeExtension('')).toBe('ts');
    });

    it('returns alphanumeric extension unchanged', () => {
      expect(sanitizeExtension('ts')).toBe('ts');
      expect(sanitizeExtension('js')).toBe('js');
      expect(sanitizeExtension('tsx')).toBe('tsx');
      expect(sanitizeExtension('json')).toBe('json');
    });

    it('removes leading dot', () => {
      expect(sanitizeExtension('.ts')).toBe('ts');
      expect(sanitizeExtension('.js')).toBe('js');
    });

    it('removes all non-alphanumeric characters', () => {
      expect(sanitizeExtension('t.s')).toBe('ts');
      expect(sanitizeExtension('j-s')).toBe('js');
      expect(sanitizeExtension('t_s')).toBe('ts');
      expect(sanitizeExtension('ts!')).toBe('ts');
      expect(sanitizeExtension('./ts')).toBe('ts');
    });

    it('returns ts for all-special-char input', () => {
      expect(sanitizeExtension('...')).toBe('ts');
      expect(sanitizeExtension('---')).toBe('ts');
      expect(sanitizeExtension('!!!')).toBe('ts');
    });

    it('prevents path traversal attempts', () => {
      expect(sanitizeExtension('../etc/passwd')).toBe('etcpasswd');
      expect(sanitizeExtension('../../')).toBe('ts');
    });
  });

  describe('escapeDoubleQuotes', () => {
    it('returns empty string for non-string input', () => {
      expect(escapeDoubleQuotes(null)).toBe('');
      expect(escapeDoubleQuotes(undefined)).toBe('');
      expect(escapeDoubleQuotes(123)).toBe('');
    });

    it('returns unchanged string without special chars', () => {
      expect(escapeDoubleQuotes('hello')).toBe('hello');
      expect(escapeDoubleQuotes('hello world')).toBe('hello world');
    });

    it('escapes dollar signs', () => {
      expect(escapeDoubleQuotes('$HOME')).toBe('\\$HOME');
      expect(escapeDoubleQuotes('${HOME}')).toBe('\\${HOME}');
    });

    it('escapes backticks', () => {
      expect(escapeDoubleQuotes('`cmd`')).toBe('\\`cmd\\`');
    });

    it('escapes double quotes', () => {
      expect(escapeDoubleQuotes('say "hi"')).toBe('say \\"hi\\"');
    });

    it('escapes backslashes', () => {
      expect(escapeDoubleQuotes('C:\\path')).toBe('C:\\\\path');
    });

    it('escapes newlines', () => {
      expect(escapeDoubleQuotes('line1\nline2')).toBe('line1\\\nline2');
    });

    it('does not escape single quotes (safe in double quotes)', () => {
      expect(escapeDoubleQuotes("don't")).toBe("don't");
    });

    it('does not escape spaces (safe in double quotes)', () => {
      expect(escapeDoubleQuotes('hello world')).toBe('hello world');
    });
  });

  describe('quoteShell', () => {
    it('returns empty quotes for non-string input', () => {
      expect(quoteShell(null)).toBe("''");
      expect(quoteShell(undefined)).toBe("''");
      expect(quoteShell(123)).toBe("''");
    });

    it('wraps simple string in single quotes', () => {
      expect(quoteShell('hello')).toBe("'hello'");
      expect(quoteShell('hello world')).toBe("'hello world'");
    });

    it('handles empty string', () => {
      expect(quoteShell('')).toBe("''");
    });

    it('escapes embedded single quotes', () => {
      expect(quoteShell("don't")).toBe("'don'\\''t'");
    });

    it('handles multiple single quotes', () => {
      expect(quoteShell("it's a 'test'")).toBe("'it'\\''s a '\\''test'\\'''");
    });

    it('does not escape other special characters (safe in single quotes)', () => {
      // In single quotes, these are all literal
      expect(quoteShell('$HOME')).toBe("'$HOME'");
      expect(quoteShell('`cmd`')).toBe("'`cmd`'");
      expect(quoteShell('foo; bar')).toBe("'foo; bar'");
      expect(quoteShell('foo | bar')).toBe("'foo | bar'");
    });

    it('handles newlines (literal in single quotes)', () => {
      expect(quoteShell('line1\nline2')).toBe("'line1\nline2'");
    });
  });
});
