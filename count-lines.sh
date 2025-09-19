#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

mapfile -d '' files < <(
  find "$repo_root" \
    -type d \( -name node_modules -o -name dist -o -name .git -o -name coverage -o -name build -o -name .turbo \) -prune \
    -o -type f ! -name 'package-lock.json' -print0
)

total=0

for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    lines=$(wc -l < "$file" 2>/dev/null || echo 0)
    total=$((total + lines))
  fi
done

echo "$total"
