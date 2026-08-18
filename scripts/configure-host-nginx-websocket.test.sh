#!/usr/bin/env bash

set -euo pipefail

if [[ "${NGINX_FIXTURE_TEST:-}" != "1" ]]; then
  echo "격리된 컨테이너에서 NGINX_FIXTURE_TEST=1로 실행해야 합니다." >&2
  exit 1
fi

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p /etc/nginx/sites-enabled /etc/nginx/conf.d /etc/nginx/snippets

printf '%s\n' \
  'server {' \
  '    listen 443 ssl;' \
  '    server_name devpath.kr www.devpath.kr;' \
  '    client_max_body_size 10m;' \
  '' \
  '    location / {' \
  '        proxy_pass http://127.0.0.1:8084;' \
  '    }' \
  '}' \
  > /etc/nginx/sites-enabled/devpath.conf

printf '%s\n' \
  'location /ws/ {' \
  '    proxy_pass http://127.0.0.1:8083;' \
  '}' \
  > /etc/nginx/snippets/devpath-websocket.conf

printf '%s\n' '#!/bin/sh' 'exec "$@"' > /usr/local/bin/sudo
printf '%s\n' '#!/bin/sh' 'exit 0' > /usr/local/bin/systemctl
cat > /usr/local/bin/nginx <<'EOF'
#!/usr/bin/env bash

set -euo pipefail

if [[ "${1:-}" == "-t" ]]; then
  directive_count="$({
    grep -RhE '^[[:space:]]*client_max_body_size[[:space:]]+' \
      /etc/nginx/sites-enabled /etc/nginx/snippets || true
  } | wc -l)"
  [[ "${directive_count}" -eq 1 ]]
  grep -Eq '^[[:space:]]*client_max_body_size[[:space:]]+55m;' \
    /etc/nginx/sites-enabled/devpath.conf
  ! grep -Eq 'client_max_body_size' \
    /etc/nginx/snippets/devpath-websocket.conf
  grep -Fq 'location /ws/' /etc/nginx/snippets/devpath-websocket.conf
fi
EOF
chmod +x /usr/local/bin/sudo /usr/local/bin/nginx /usr/local/bin/systemctl

bash "${repo_root}/scripts/configure-host-nginx-websocket.sh"
cp /etc/nginx/sites-enabled/devpath.conf /tmp/devpath-site-first.conf
cp /etc/nginx/snippets/devpath-websocket.conf /tmp/devpath-snippet-first.conf

bash "${repo_root}/scripts/configure-host-nginx-websocket.sh"
cmp /tmp/devpath-site-first.conf /etc/nginx/sites-enabled/devpath.conf
cmp /tmp/devpath-snippet-first.conf /etc/nginx/snippets/devpath-websocket.conf

[[ "$(grep -cF 'include /etc/nginx/snippets/devpath-websocket.conf;' \
  /etc/nginx/sites-enabled/devpath.conf)" -eq 1 ]]
[[ "$(grep -cE '^[[:space:]]*client_max_body_size[[:space:]]+55m;' \
  /etc/nginx/sites-enabled/devpath.conf)" -eq 1 ]]

echo "configure-host-nginx-websocket fixture passed"
