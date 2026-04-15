# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a macOS dotfiles repository. It contains shell configuration, git configuration, and a Brewfile for bootstrapping a new Mac. Files are meant to be symlinked from `~/.dotfiles/` into the home directory.

## Symlink Setup

The dotfiles are activated by symlinking them:

```zsh
ln -s ~/.dotfiles/.zshrc ~/.zshrc
ln -s ~/.dotfiles/.gitconfig ~/.gitconfig
```

## Package Management

```zsh
# Install all packages from Brewfile
brew bundle --file ~/.dotfiles/Brewfile

# Export currently installed packages to Brewfile
brew bundle dump --describe --file ~/.dotfiles/Brewfile
```

## Git Hooks

A global `commit-msg` hook lives at `~/.git-hooks/commit-msg` (referenced by `.gitconfig`'s `core.hooksPath`). It strips `Co-Authored-By:` lines from AI tools (Claude, Copilot, ChatGPT, Gemini, Cursor) while preserving human co-author lines.

### Running hook tests

```zsh
bash tests/commit-msg.test.sh
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

`commitizen` is installed (via Brew). Commit messages should follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.) as enforced by the repo's style and tested by `tests/commit-msg.test.sh`.
