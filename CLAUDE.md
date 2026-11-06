# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a macOS dotfiles repository. It contains shell configuration, git configuration, and a Brewfile for bootstrapping a new Mac. Files are meant to be symlinked from `~/.dotfiles/` into the home directory.

## Symlink Setup

The dotfiles are activated by symlinking them:

```zsh
ln -s ~/.dotfiles/.zshrc ~/.zshrc
ln -s ~/.dotfiles/.gitconfig ~/.gitconfig
ln -s ~/.dotfiles/.zshenv ~/.zshenv
ln -s ~/.dotfiles/.git-hooks ~/.git-hooks
ln -s ~/.dotfiles/.git-template ~/.git-template
```

## Package Management

```zsh
# Install all packages from Brewfile
brew bundle --file ~/.dotfiles/Brewfile

# Export currently installed packages to Brewfile
brew bundle dump --describe --file ~/.dotfiles/Brewfile
```

## Git Hooks

A global `commit-msg` hook lives at `~/.git-hooks/commit-msg` (referenced by `.gitconfig`'s `core.hooksPath`). It strips `Co-Authored-By:` and "Generated with" lines naming AI tools, and keeps human co-author lines. The scripts are tracked in `.git-hooks/`.

`hook.*` entries in `.gitconfig` run `~/.git-hooks/strip-ai-attribution` and `~/.git-hooks/branch-name-rule` in every repo, including one with its own `core.hooksPath`. They need Git 2.54 or later.

### Running hook tests

```zsh
bash tests/commit-msg.test.sh
bash tests/branch-name-rule.test.sh
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
