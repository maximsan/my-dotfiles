#!/bin/sh
HOOK="$HOME/.git-hooks/commit-msg"
TMPFILE=$(mktemp)

# Case 1: strips Claude
printf "feat: my commit\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>\n" > "$TMPFILE"
"$HOOK" "$TMPFILE"
if grep -q "Co-Authored-By: Claude" "$TMPFILE"; then
  echo "FAIL: Claude Co-Authored-By was not removed"; rm "$TMPFILE"; exit 1
fi

# Case 2: strips GitHub Copilot
printf "feat: my commit\n\nCo-Authored-By: GitHub Copilot <copilot@github.com>\n" > "$TMPFILE"
"$HOOK" "$TMPFILE"
if grep -q "Co-Authored-By:.*[Cc]opilot" "$TMPFILE"; then
  echo "FAIL: Copilot Co-Authored-By was not removed"; rm "$TMPFILE"; exit 1
fi

# Case 3: strips ChatGPT
printf "feat: my commit\n\nCo-Authored-By: ChatGPT <chatgpt@openai.com>\n" > "$TMPFILE"
"$HOOK" "$TMPFILE"
if grep -q "Co-Authored-By:.*[Cc]hat[Gg][Pp][Tt]" "$TMPFILE"; then
  echo "FAIL: ChatGPT Co-Authored-By was not removed"; rm "$TMPFILE"; exit 1
fi

# Case 4: strips Cursor
printf "feat: my commit\n\nCo-Authored-By: Cursor <cursor@cursor.sh>\n" > "$TMPFILE"
"$HOOK" "$TMPFILE"
if grep -q "Co-Authored-By:.*[Cc]ursor" "$TMPFILE"; then
  echo "FAIL: Cursor Co-Authored-By was not removed"; rm "$TMPFILE"; exit 1
fi

# Case 5: preserves human Co-Authored-By lines
printf "feat: my commit\n\nCo-Authored-By: Alice <alice@example.com>\n" > "$TMPFILE"
"$HOOK" "$TMPFILE"
if ! grep -q "Co-Authored-By: Alice" "$TMPFILE"; then
  echo "FAIL: human Co-Authored-By line was removed"; rm "$TMPFILE"; exit 1
fi

# Case 6: no-op on clean messages
printf "feat: clean commit\n" > "$TMPFILE"
"$HOOK" "$TMPFILE"
CONTENT=$(cat "$TMPFILE")
if [ "$CONTENT" != "feat: clean commit" ]; then
  echo "FAIL: clean message was modified"; rm "$TMPFILE"; exit 1
fi

rm "$TMPFILE"
echo "All tests passed."
