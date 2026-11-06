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

The hook scripts are tracked in `.git-hooks/`. They reach every repo by two routes:

- `.gitconfig`'s `core.hooksPath` runs `_dispatch` under each common hook name. It runs the repo's own hook first, and works on Git versions older than 2.54.
- `hook.*` entries in `.gitconfig` run `strip-ai-attribution` and `branch-name-rule` even in a repo with its own `core.hooksPath`. They need Git 2.54 or later, which added hooks defined in config.

`strip-ai-attribution` removes AI `Co-Authored-By:` and "Generated with", "by" or "using" lines, and keeps human co-authors. Inside Claude Code it also adds a `Claude-Session-Id:` line. Running it twice on one message is safe.

`branch-name-rule` refuses branch names outside `<type>/<lowercase-with-dashes>` in maximsan's GitHub repos.

`.git-template/` is copied into each new repo. Its `commit-msg` hook runs the global one.

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
