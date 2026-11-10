# In shells started by AI coding tools, a wildcard with no match stays as plain
# text, as in bash. Only the command using it fails, and the script continues.
[[ -n "$CLAUDECODE$CODEX_SHELL$CURSOR_AGENT$OPENCODE" ]] && setopt NO_NOMATCH
