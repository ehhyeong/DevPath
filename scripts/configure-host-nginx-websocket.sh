#!/usr/bin/env bash

set -euo pipefail

readonly snippet_path="/etc/nginx/snippets/devpath-websocket.conf"
readonly include_line="include ${snippet_path};"
backup_dir="$(mktemp -d)"
rollback_required=true
had_snippet=false
backed_up_site_count=0
site_files=()

cleanup() {
  if [[ "${rollback_required}" == true ]]; then
    for ((index = 0; index < backed_up_site_count; index++)); do
      sudo cp "${backup_dir}/site-${index}.conf" "${site_files[$index]}"
    done

    if [[ "${had_snippet}" == true ]]; then
      sudo cp "${backup_dir}/websocket-snippet.conf" "${snippet_path}"
    else
      sudo rm -f "${snippet_path}"
    fi

    sudo nginx -t >/dev/null 2>&1 || true
  fi

  rm -rf "${backup_dir}"
}

trap cleanup EXIT

while IFS= read -r site_file; do
  site_files+=("${site_file}")
done < <(
  sudo grep -RIlE 'server_name[^;]*devpath\.kr' \
    /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
    | sort -u
)

if [[ "${#site_files[@]}" -eq 0 ]]; then
  echo "devpath.kr Nginx server block을 찾지 못했습니다." >&2
  exit 1
fi

if sudo test -f "${snippet_path}"; then
  had_snippet=true
  sudo cp "${snippet_path}" "${backup_dir}/websocket-snippet.conf"
fi

for index in "${!site_files[@]}"; do
  site_file="${site_files[$index]}"
  sudo cp "${site_file}" "${backup_dir}/site-${index}.conf"
  backed_up_site_count=$((backed_up_site_count + 1))

  if sudo grep -Fq "${include_line}" "${site_file}"; then
    continue
  fi

  if ! sudo grep -Eq '^[[:space:]]*location[[:space:]]+/[[:space:]]*\{' "${site_file}"; then
    echo "${site_file}에서 기본 location 블록을 찾지 못했습니다." >&2
    exit 1
  fi

  sudo sed -i -E \
    "/^[[:space:]]*location[[:space:]]+\/[[:space:]]*\{/i\\        ${include_line}" \
    "${site_file}"
done

snippet_file="${backup_dir}/devpath-websocket.conf"
cat > "${snippet_file}" <<'EOF'
client_max_body_size 55m;

location /ws/ {
    proxy_pass http://127.0.0.1:8083;
    proxy_http_version 1.1;
    access_log off;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
EOF

sudo install -d -m 0755 "$(dirname "${snippet_path}")"
sudo install -m 0644 "${snippet_file}" "${snippet_path}"
sudo nginx -t
sudo systemctl reload nginx

rollback_required=false
echo "devpath.kr 업로드와 WebSocket 프록시 설정을 적용했습니다."
