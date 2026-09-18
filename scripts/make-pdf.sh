#!/usr/bin/env bash
# ピッチデックを PDF に書き出す。
#
# 前提: Chromium（Playwright 同梱のもので可）と、Google Fonts を
#       静的 TTF に変換して ~/.fonts に置いてあること。
#       可変フォントのままだと family 名が既定インスタンス名になり
#       fontconfig が解決できないため、静的化が必要。
#
# 使い方: bash scripts/make-pdf.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/80-pitch.html"
OUT="$ROOT/dist/xrpl-leash-pitch.pdf"
TMP="$(mktemp -d)"
CHROME="${CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"

mkdir -p "$ROOT/dist"

# Artifact の公開時スケルトンに相当する部分を補い、単体で正しく描画させる。
# フォントはネットワークではなくシステムから解決させる。
python3 - "$SRC" "$TMP/print.html" <<'PY'
import re, sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text()
src = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', src)
src = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*">\s*', '', src)
pathlib.Path(sys.argv[2]).write_text(
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    '<style>html{color-scheme:light}body{margin:0}img{max-width:100%}'
    '@page{size:A4;margin:14mm 12mm}</style>\n' + src + '\n</body>\n</html>')
PY

"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --virtual-time-budget=15000 --print-to-pdf-no-header \
  --print-to-pdf="$OUT" "file://$TMP/print.html" 2>/dev/null

rm -rf "$TMP"
echo "書き出し: $OUT"
python3 - "$OUT" <<'PY'
import re, sys
d = open(sys.argv[1], 'rb').read()
print('  ページ数:', len(re.findall(rb'/Type\s*/Page[^s]', d)))
print('  フォント:', ', '.join(sorted({n.decode().split('+')[-1] for n in re.findall(rb'/BaseFont\s*/([^\s/>\]]+)', d)})))
PY
