# Incident Ticket Report

## Summary
[CRITICAL] PostgreSQL database service down due to disk saturation on db-prod-01

## Priority
P1 - Critical

## Affected System
- Hostname: `db-prod-01.corp.lan`
- Service: PostgreSQL 16 Production Database Server

## Symptoms & Impact
- PostgreSQL service `postgresql.service` failed to start and is currently inactive (dead).
- Corporate ERP application is completely unreachable for over 150 active business users.
- System logs report error: `FATAL: could not write to log file: No space left on device`.

## Troubleshooting & Workaround
- Executed `df -h /var/lib/postgresql`: partition is 100% full (0 bytes free).
- Applied temporary emergency workaround: purged obsolete archive logs and temporary vacuum files, freeing approximately 2 GB of disk space.
- Service temporarily restarted, but storage growth requires immediate capacity extension to prevent recurring outage.

## Action Requested
- Escalate to Tier 2 Infrastructure Team to expand the underlying LVM / virtual disk partition by at least 50 GB.
- Review database WAL retention policy and automated disk alert thresholds.
