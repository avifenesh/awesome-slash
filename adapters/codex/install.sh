#!/usr/bin/env bash
set -e

# Codex CLI Installer for awsome-slash commands
# This script installs all 5 slash commands for use with OpenAI Codex CLI

echo "🚀 Installing awsome-slash commands for Codex CLI..."
echo

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CODEX_CONFIG_DIR="${HOME}/.codex"
CODEX_PROMPTS_DIR="${CODEX_CONFIG_DIR}/prompts/awsome-slash"
COMMANDS_DIR="${CODEX_PROMPTS_DIR}/commands"
LIB_DIR="${CODEX_PROMPTS_DIR}/lib"

# Detect OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  IS_WINDOWS=true
  CODEX_CONFIG_DIR="${USERPROFILE}/.codex"
  CODEX_PROMPTS_DIR="${CODEX_CONFIG_DIR}/prompts/awsome-slash"
  COMMANDS_DIR="${CODEX_PROMPTS_DIR}/commands"
  LIB_DIR="${CODEX_PROMPTS_DIR}/lib"
else
  IS_WINDOWS=false
fi

echo "📂 Configuration:"
echo "  Repository: $REPO_ROOT"
echo "  Install to: $CODEX_PROMPTS_DIR"
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

# Check Codex CLI (optional - user may not have it installed yet)
if command -v codex &> /dev/null; then
  CODEX_VERSION=$(codex --version 2>&1 | head -n1 || echo "unknown")
  echo "  ✓ Codex CLI $CODEX_VERSION"
else
  echo "  ⚠️  Codex CLI not found (install from: https://developers.openai.com/codex/cli)"
  echo "     You can still install commands and use Codex CLI later"
fi

echo

# Create directories
echo "📁 Creating directories..."
mkdir -p "$COMMANDS_DIR"
mkdir -p "$LIB_DIR"/{platform,patterns,utils}
echo "  ✓ Created $COMMANDS_DIR"
echo "  ✓ Created $LIB_DIR"
echo

# Copy library files
echo "📚 Installing shared libraries..."
cp -r "$REPO_ROOT/plugins/deslop-around/lib/"* "$LIB_DIR/"
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
  TARGET_FILE="$COMMANDS_DIR/$cmd.md"

  if [ -f "$SOURCE_FILE" ]; then
    # Replace Claude-specific path variables with Codex paths
    sed "s|\${CLAUDE_PLUGIN_ROOT}|${CODEX_PROMPTS_DIR}|g" "$SOURCE_FILE" > "$TARGET_FILE"
    echo "  ✓ Installed /$cmd"
  else
    echo "  ⚠️  Skipped /$cmd (source not found)"
  fi
done

echo

# Create environment setup script
echo "📝 Creating environment setup..."
cat > "$CODEX_PROMPTS_DIR/env.sh" << 'EOF'
#!/usr/bin/env bash
# Environment variables for awsome-slash commands in Codex CLI

# Set the root directory for commands to find libraries
export CODEX_PROMPTS_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Add lib directory to NODE_PATH if needed
export NODE_PATH="${CODEX_PROMPTS_ROOT}/lib:${NODE_PATH}"

# Platform detection helpers
export AWSOME_SLASH_PLATFORM_SCRIPT="${CODEX_PROMPTS_ROOT}/lib/platform/detect-platform.js"
export AWSOME_SLASH_TOOLS_SCRIPT="${CODEX_PROMPTS_ROOT}/lib/platform/verify-tools.js"
EOF

chmod +x "$CODEX_PROMPTS_DIR/env.sh"
echo "  ✓ Created environment setup script"
echo

# Create README
cat > "$CODEX_PROMPTS_DIR/README.md" << 'EOF'
# awsome-slash for Codex CLI

This directory contains the awsome-slash commands adapted for OpenAI Codex CLI.

## Available Commands

- `/deslop-around` - AI slop cleanup with minimal diffs
- `/next-task` - Intelligent task prioritization
- `/project-review` - Multi-agent code review
- `/ship` - Complete PR workflow
- `/pr-merge` - Intelligent PR merge

## Usage

In Codex CLI, invoke commands directly:

```bash
/deslop-around
/next-task
/project-review
/ship
/pr-merge
```

## Environment

Commands use the shared library at:
```
~/.codex/prompts/awsome-slash/lib/
```

## Updates

To update commands, re-run the installer:
```bash
cd /path/to/awsome-slash
./adapters/codex/install.sh
```

## Support

- Repository: https://github.com/avifenesh/awsome-slash
- Issues: https://github.com/avifenesh/awsome-slash/issues
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
echo "  1. Start Codex CLI: codex"
echo "  2. Use commands: /$cmd"
echo "  3. See help: cat $CODEX_PROMPTS_DIR/README.md"
echo
echo "🔄 To update commands, re-run this installer:"
echo "  ./adapters/codex/install.sh"
echo
echo "Happy coding! 🎉"
