#!/bin/bash
# Nightly MongoDB backup, invoked from root's crontab alongside the existing cert-renewal entry
# (see ../PRODUCTION_DEPLOYMENT_PLAN.md). This server has no prior Mongo backup convention — this
# establishes one, the same way the sibling app added the first Postgres one.
#
# Backs up the database AND the uploaded media: the two are useless apart. A restored database
# whose images are gone renders a site full of placeholders, and orphaned image files with no
# documents referencing them are unrecoverable content.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

mkdir -p backups
stamp="$(date +%F)"

# --archive streams to stdout rather than writing a dump directory inside the container, which
# matters because the API container's filesystem is read-only and mongo's is not ours to litter.
docker exec hc_abofonsa_mongo mongodump --db abofonsa --archive --quiet \
  | gzip > "backups/abofonsa_${stamp}.archive.gz"

# Media lives in a Docker volume; tar it from a throwaway container that mounts it read-only.
docker run --rm \
  -v hc-abofonsa_media-data:/media:ro \
  -v "$(pwd)/backups:/backups" \
  alpine:3 tar czf "/backups/abofonsa_media_${stamp}.tar.gz" -C /media .

# 14-day retention, matching the sibling app.
find backups -name '*.gz' -mtime +14 -delete

echo "backup complete:"
ls -la "backups/abofonsa_${stamp}.archive.gz" "backups/abofonsa_media_${stamp}.tar.gz"
