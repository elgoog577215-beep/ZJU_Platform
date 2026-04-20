# Database Backups

This directory holds cold backups of `server/database.sqlite` that
`scripts/fix-schema.js` creates before running a migration.

## File naming

```
database.sqlite.bak.YYYY-MM-DDTHH-MM-SS           ← main DB file snapshot
database.sqlite-wal.bak.YYYY-MM-DDTHH-MM-SS       ← WAL sidecar (if present at backup time)
database.sqlite-shm.bak.YYYY-MM-DDTHH-MM-SS       ← shared-memory sidecar (if present at backup time)
```

## Ignored by git

Backup files (`*.bak.*`) are excluded via `.gitignore`. This directory is
kept in the repo via `.gitkeep` so the script has a predictable target.

## Restoring

If a migration looks wrong, point the server back at a backup:

```bash
# From project root
cp server/backups/database.sqlite.bak.<timestamp> server/database.sqlite
# Also restore the WAL/SHM sidecars if they exist for the same timestamp:
cp server/backups/database.sqlite-wal.bak.<timestamp> server/database.sqlite-wal  # optional
cp server/backups/database.sqlite-shm.bak.<timestamp> server/database.sqlite-shm  # optional
# Then restart the app server
```

## Cleanup

Backups never auto-delete. If the directory grows too large, remove old
timestamped files manually after confirming the current DB is healthy.
