#!/usr/bin/env bash
# Checks if a stream is alive (8s max, saves nothing).
# usage: scripts/probe-stream.sh URL  ->  "http_code|content_type|bytes|curl_error"
r=$(curl -sS -L --http0.9 -m 8 -o /dev/null -A "Mozilla/5.0" -w "%{http_code}|%{content_type}|%{size_download}" "$1" 2>&1)
err=$(printf '%s' "$r" | grep -o 'curl: ([0-9]*)[^|]*' | head -1 | cut -c1-60)
printf '%s|%s\n' "$(printf '%s' "$r" | grep -oE '[0-9]{3}\|[^|]*\|[0-9]+$')" "$err"
