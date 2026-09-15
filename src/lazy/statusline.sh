#!/usr/bin/env bash
flag="$HOME/.context-saver/lazy-state-claude.json"
[ -f "$flag" ] || exit 0

mode=$(node -e "try{const s=JSON.parse(require('fs').readFileSync('$flag','utf8'));process.stdout.write(s.mode||'')}catch(e){}")
[ -z "$mode" ] && exit 0

color=108
[ "$mode" = "ultra" ] && color=173

if [ "$mode" = "full" ]; then
    printf '\033[38;5;%sm[LAZY]\033[0m' "$color"
else
    printf '\033[38;5;%sm[LAZY:%s]\033[0m' "$color" "$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
fi
