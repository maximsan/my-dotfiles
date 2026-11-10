# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a macOS dotfiles repository. It contains shell configuration, git configuration, and a Brewfile for bootstrapping a new Mac. Files are meant to be symlinked from `~/.dotfiles/` into the home directory.

## Symlink Setup

The dotfiles are activated by symlinks. The commands are in step 3 of `README.md`.

## Package Management

```zsh
# Install all packages from Brewfile
brew bundle --file ~/.dotfiles/Brewfile

# Export currently installed packages to Brewfile
brew bundle dump --describe --file ~/.dotfiles/Brewfile
```

## Git Hooks

`hook.*` entries in `.gitconfig` run two scripts from `.git-hooks/` in every repo, as well as the repo's own hooks. They
need Git 2.54 or later; older Git skips them silently. Without `node` on the PATH, they let git continue.

- `strip-ai-attribution.mjs` removes AI `Co-Authored-By:` lines and "Generated with", "by" or "using" lines, and keeps
  human co-authors. Inside Claude Code it adds a `Claude-Session-Id:` line.
- `branch-name-rule.mjs` refuses branch names outside `<type>/<lowercase-with-dashes>` in maximsan's GitHub repos.

### Running hook tests and lint

```zsh
node --test
# The scripts follow the my-skills lint rules, until this repo moves into my-skills.
npx --prefix ~/projects/my/skills eslint --config ~/projects/my/skills/eslint.config.mjs .git-hooks
```

## Key Configuration

- **Shell**: zsh with oh-my-zsh (`robbyrussell` theme), `git` plugin
- **Node**: managed via Volta (`~/.volta`); Node 18 also on PATH via Homebrew
- **Python**: managed via pyenv
- **Ruby**: managed via rbenv; also Homebrew Ruby at `/opt/homebrew/opt/ruby`
- **Package managers on PATH**: pnpm, yarn (global bin), cargo (Rust)
- **Git editor**: VS Code (`code --wait`)
- **Git default branch**: `main`, pull strategy: merge (not rebase)

## Conventional Commits

`commitizen` is installed (via Brew). Commit messages should follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.) as enforced by the repo's style.
