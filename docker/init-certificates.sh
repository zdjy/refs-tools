#!/bin/sh
set -eu

# 私钥留在 Docker volume；证书同时覆盖浏览器入口和容器内 SMTP 主机名。
if [ -s /certs/local.crt ] && [ -s /certs/local.key ]; then
  exit 0
fi

umask 077
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 365 \
  -keyout /certs/local.key -out /certs/local.crt \
  -subj '/CN=refs-tools local development' \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:mailpit' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign' \
  -addext 'extendedKeyUsage=serverAuth'
chmod 644 /certs/local.crt
