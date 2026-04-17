#!/usr/bin/env bash
# Mixable CSS 静的検証ランナー
# 使い方: bash tests/run.sh
# 失敗時は exit 1
set -eu
cd "$(dirname "$0")/.."
exec node tests/check.mjs
