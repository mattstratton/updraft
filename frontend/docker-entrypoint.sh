#!/bin/sh
set -e

echo "=== Updraft Frontend Startup ==="
echo "Checking files..."
ls -la /usr/share/nginx/html/ | head -10
test -f /usr/share/nginx/html/index.html || (echo "ERROR: index.html not found!" && exit 1)

echo "Testing nginx configuration..."
nginx -t

echo "Starting nginx in foreground..."
exec nginx -g "daemon off;"

