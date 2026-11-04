#!/bin/sh
set -eu

# 管理凭据只用于初始化；API 使用限定到媒体前缀的独立账号。
mcli alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mcli mb --ignore-existing local/refs-tools-media >/dev/null
mcli anonymous set none local/refs-tools-media >/dev/null
cat > /tmp/media-policy.json <<'POLICY'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],"Resource":["arn:aws:s3:::refs-tools-media/media/*"]}]}
POLICY
mcli admin policy create local refs-tools-media /tmp/media-policy.json >/dev/null
mcli admin user add local "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" >/dev/null
mcli admin policy attach local refs-tools-media --user "$S3_ACCESS_KEY_ID" >/dev/null
