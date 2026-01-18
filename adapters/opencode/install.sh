#!/usr/bin/env bash
set -e

# OpenCode Installer for awesome-slash commands
# This script installs all 5 slash commands for use with OpenCode

echo "🚀 Installing awesome-slash commands for OpenCode..."
echo

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Use $HOME which works correctly on all platforms including Git Bash on Windows
# (Git Bash sets HOME to Unix-style path like /c/Users/username)
OPENCODE_CONFIG_DIR="${HOME}/.opencode"
OPENCODE_COMMANDS_DIR="${OPENCODE_CONFIG_DIR}/commands/awesome-slash"
LIB_DIR="${OPENCODE_COMMANDS_DIR}/lib"

# Detect OS for platform-specific notes
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
  IS_WINDOWS=true
else
  IS_WINDOWS=false
fi

echo "📂 Configuration:"
echo "  Repository: $REPO_ROOT"
echo "  Install to: $OPENCODE_COMMANDS_DIR"
echo

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from: https://nodejs.org"
  exit 1
fi
NODE_VERSION=$(node --version)
echo "  ✓ Node.js $NODE_VERSION"

# Check Git
if ! command -v git &> /dev/null; then
  echo "❌ Git not found. Install from: https://git-scm.com"
  exit 1
fi
GIT_VERSION=$(git --version | cut -d' ' -f3)
echo "  ✓ Git $GIT_VERSION"

# Check OpenCode (optional - user may not have it installed yet)
if command -v opencode &> /dev/null; then
  OPENCODE_VERSION=$(opencode --version 2>&1 | head -n1 || echo "unknown")
  echo "  ✓ OpenCode $OPENCODE_VERSION"
else
  echo "  ⚠️  OpenCode not found (install from: https://opencode.ai)"
  echo "     You can still install commands and use OpenCode later"
fi

echo

# Create directories
echo "📁 Creating directories..."
mkdir -p "$OPENCODE_COMMANDS_DIR"
mkdir -p "$LIB_DIR"/{platform,patterns,utils}
echo "  ✓ Created $OPENCODE_COMMANDS_DIR"
echo "  ✓ Created $LIB_DIR"
echo

# Copy library files from shared root lib directory
echo "📚 Installing shared libraries..."
# Use explicit iteration to handle paths with spaces safely
for item in "${REPO_ROOT}/lib"/*; do
  cp -r "$item" "${LIB_DIR}/"
done
echo "  ✓ Copied platform detection"
echo "  ✓ Copied pattern libraries"
echo "  ✓ Copied utility functions"
echo

# Install commands with path adjustments
echo "⚙️  Installing commands..."

COMMANDS=(
  "deslop-around"
  "next-task"
  "project-review"
  "ship"
  "pr-merge"
)

for cmd in "${COMMANDS[@]}"; do
  SOURCE_FILE="$REPO_ROOT/plugins/$cmd/commands/$cmd.md"
  TARGET_FILE="$OPENCODE_COMMANDS_DIR/$cmd.md"

  if [ -f "$SOURCE_FILE" ]; then
    # Copy command file - OpenCode will resolve paths at runtime
    # Note: ${CLAUDE_PLUGIN_ROOT} references are kept as-is since OpenCode
    # uses different path resolution mechanisms
    cp "$SOURCE_FILE" "$TARGET_FILE"
    echo "  ✓ Installed /$cmd"
  else
    echo "  ⚠️  Skipped /$cmd (source not found)"
  fi
done

echo

# Create environment setup script
echo "📝 Creating environment setup..."
cat > "$OPENCODE_COMMANDS_DIR/env.sh" << 'EOF'
#!/usr/bin/env bash
# Environment variables for awesome-slash commands in OpenCode

# Set the root directory for commands to find libraries
export OPENCODE_COMMANDS_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Add lib directory to NODE_PATH if needed
export NODE_PATH="${OPENCODE_COMMANDS_ROOT}/lib:${NODE_PATH}"

# Platform detection helpers
export AWESOME_SLASH_PLATFORM_SCRIPT="${OPENCODE_COMMANDS_ROOT}/lib/platform/detect-platform.js"
export AWESOME_SLASH_TOOLS_SCRIPT="${OPENCODE_COMMANDS_ROOT}/lib/platform/verify-tools.js"
EOF

chmod +x "$OPENCODE_COMMANDS_DIR/env.sh"
echo "  ✓ Created environment setup script"
echo

# Create README
cat > "$OPENCODE_COMMANDS_DIR/README.md" << 'EOF'
# awesome-slash for OpenCode

This directory contains the awesome-slash commands adapted for OpenCode.

## Available Commands

- `/deslop-around` - AI slop cleanup with minimal diffs
- `/next-task` - Intelligent task prioritization
- `/project-review` - Multi-agent code review
- `/ship` - Complete PR workflow
- `/pr-merge` - Intelligent PR merge

## Usage

In OpenCode TUI, invoke commands directly:

```bash
/deslop-around
/next-task
/project-review
/ship
/pr-merge
```

You can also pass arguments:
```bash
/deslop-around apply
/next-task bug
/ship --strategy rebase
```

## OpenCode-Specific Features

OpenCode supports additional features you can use with these commands:

- **@filename** - Include file contents in prompt
- **!command** - Include bash command output in prompt

Example:
```bash
/project-review @src/main.py
/deslop-around apply !git diff --name-only
```

## Environment

Commands use the shared library at:
```
~/.opencode/commands/awesome-slash/lib/
```

## Updates

To update commands, re-run the installer:
```bash
cd /path/to/awesome-slash
./adapters/opencode/install.sh
```

## Support

- Repository: https://github.com/avifenesh/awesome-slash
- Issues: https://github.com/avifenesh/awesome-slash/issues
EOF

echo "  ✓ Created README"
echo

# Success message
echo "✅ Installation complete!"
echo
echo "📋 Installed Commands:"
for cmd in "${COMMANDS[@]}"; do
  echo "  • /$cmd"
done
echo
echo "📖 Next Steps:"
echo "  1. Start OpenCode TUI: opencode"
echo "  2. Use commands: /$cmd"
echo "  3. See help: cat $OPENCODE_COMMANDS_DIR/README.md"
echo
echo "💡 OpenCode Pro Tips:"
echo "  • Use @filename to include file contents"
echo "  • Use !command to include bash output"
echo "  • Example: /project-review @src/main.py"
echo
echo "🔄 To update commands, re-run this installer:"
echo "  ./adapters/opencode/install.sh"
echo
echo "Happy coding! 🎉"
