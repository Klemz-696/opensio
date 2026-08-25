# ==============================================================================
# OpenSIO Backup — Dockerfile PostgreSQL 18 Client & Chiffrement (D-18)
# ==============================================================================

FROM postgres:18-alpine

RUN apk add --no-cache openssl bash gzip coreutils busybox-suid

WORKDIR /scripts

COPY scripts/backup.sh /scripts/backup.sh
COPY scripts/restore.sh /scripts/restore.sh
COPY infra/docker/backup/entrypoint.sh /scripts/entrypoint.sh

RUN chmod +x /scripts/backup.sh /scripts/restore.sh /scripts/entrypoint.sh && \
    mkdir -p /backups /var/log

VOLUME ["/backups"]

ENTRYPOINT ["/scripts/entrypoint.sh"]
