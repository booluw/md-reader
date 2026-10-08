#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

BASE_URL="${1:-https://reader.myshort.page}"
FAILURES=0

say() { printf '\n== %s\n' "$*"; }
ok()  { printf '   ok: %s\n' "$*"; }
bad() { printf 'FAIL: %s\n' "$*"; FAILURES=$((FAILURES + 1)); }

http_head() { curl -fsSI --max-time 20 "$@"; }

check_status() {
  local url="$1" expected="$2" what="$3"
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$url" 2>/dev/null || true)
  if [ "$code" = "$expected" ]; then
    ok "$what (HTTP $code)"
  else
    bad "$what (HTTP $code, expected $expected)"
  fi
}

check_header_value() {
  local url="$1" header="$2" haystack="$3" what="$4"
  local value
  value=$(http_head "$url" 2>/dev/null | grep -i "^${header}:" || true)
  case "$value" in
    *"$haystack"*) ok "$what";;
    *) bad "$what — expected header '$header: …$haystack…', got: $(printf '%s' "$value" | tr -d '\r')";;
  esac
}

# `/read` is a prerendered directory, so nginx 301s `/read` -> `/read/`. The
# redirect MUST stay relative (absolute_redirect off) or it breaks behind a
# port mapping / reverse proxy, and the CSP header must ride along. Then the
# target must answer with the app shell.
check_read_src() {
  local url="$1"
  local head status_ln location
  head=$(http_head "$url" 2>/dev/null || true)
  status_ln=$(printf '%s' "$head" | head -1 | tr -d '\r')
  location=$(printf '%s' "$head" | grep -i '^location:' | tr -d '\r' | sed 's/^[Ll]ocation: //')

  if printf '%s' "$status_ln" | grep -q ' 301'; then
    case "$location" in
      http*) bad "SPA fallback — redirect is absolute, would break behind a proxy: $location";;
      /*)    ok "SPA fallback — HTTP 301 with relative Location '$location'";;
      *)     bad "SPA fallback — unexpected redirect target: $location";;
    esac
  elif printf '%s' "$status_ln" | grep -q ' 200'; then
    ok "SPA fallback — served directly (HTTP 200)"
  else
    bad "SPA fallback — unexpected status: $status_ln"
  fi

  if printf '%s' "$head" | grep -qi '^content-security-policy:'; then
    ok "SPA fallback response carries the CSP header"
  else
    bad "SPA fallback response is missing Content-Security-Policy"
  fi

  local final
  final=$(curl -fLsS -o /dev/null -w '%{http_code}' --max-time 20 "$url" 2>/dev/null || true)
  if [ "$final" = "200" ]; then
    ok "SPA fallback — app shell reachable after following the redirect"
  else
    bad "SPA fallback — following the redirect gives HTTP $final, expected 200"
  fi
}

check_no_cloudflare_cache() {
  local url="$1"
  local cf_status
  cf_status=$(http_head "$url" 2>/dev/null | grep -i '^cf-cache-status:' || true)
  if [ -z "$cf_status" ]; then
    ok "no Cloudflare caching in play (cf-cache-status absent)"
  elif printf '%s' "$cf_status" | grep -qi 'HIT'; then
    bad "Cloudflare is caching responses (cf-cache-status: $cf_status)"
  else
    ok "Cloudflare present but not serving cache hits (cf-cache-status: $(printf '%s' "$cf_status" | tr -d '\r'))"
  fi
}

say "Baseline: $BASE_URL"
check_status "$BASE_URL/" 200 "home page"

say "Security headers (served by nginx on every response)"
check_header_value "$BASE_URL/" content-security-policy 'default-src' 'index.html has CSP header'
check_header_value "$BASE_URL/" x-content-type-options 'nosniff' 'index.html has X-Content-Type-Options: nosniff'
check_header_value "$BASE_URL/" referrer-policy 'no-referrer' 'index.html has Referrer-Policy: no-referrer'

say "Caching rules"
check_header_value "$BASE_URL/index.html" cache-control 'no-cache' 'index.html is no-cache'
ASSET=$(curl -fsS --max-time 20 "$BASE_URL/" 2>/dev/null | grep -oE '/_nuxt/[^"]+\.js' | head -1 || true)
if [ -n "$ASSET" ]; then
  check_status "$BASE_URL$ASSET" 200 "hashed asset served ($ASSET)"
  check_header_value "$BASE_URL$ASSET" cache-control 'max-age' 'hashed asset is long-cached'
else
  bad "could not find a /_nuxt/*.js asset on the index page"
fi

say "SPA fallback and /read routing"
check_read_src "$BASE_URL/read?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbooluw%2Fmd-reader%2Fmain%2Fdocs%2FREADME.md"
check_status "$BASE_URL/__fixtures__/xss.md" 200 "committed Markdown fixture is reachable"
check_header_value "$BASE_URL/__fixtures__/xss.md" content-type 'text/markdown' 'Markdown fixture served as text/markdown'

say "Query-string caching in front of the app"
check_no_cloudflare_cache "$BASE_URL/read?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbooluw%2Fmd-reader%2Fmain%2Fdocs%2FREADME.md"

printf '\n%s\n' "------------------------------"
if [ "$FAILURES" -gt 0 ]; then
  printf 'smoke: %d check(s) FAILED\n' "$FAILURES" >&2
  exit 1
fi
printf 'smoke: all checks passed against %s\n' "$BASE_URL"