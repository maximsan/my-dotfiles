# Agent shells behave like bash: a pattern with no match stays as written, so
# it fails only the one command using it instead of stopping the whole script.
[[ -n "$CLAUDECODE$CODEX_SHELL$CURSOR_AGENT$OPENCODE" ]] && setopt NO_NOMATCH
