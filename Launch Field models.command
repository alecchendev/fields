#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Python 3 is needed for the optional local server. You can also serve this folder with any static web server.'
  read -r '?Press Enter to close.'
  exit 1
fi
python3 scripts/serve.py
