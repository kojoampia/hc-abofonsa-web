# Abofonsa BridgeCare — production deployment runbook

Deploys to **webserver**, at `~/webroot/01-healthconnect/abofonsa/`, following the conventions that
host already uses (see `../../hc-crowdfund-app/infra/PRODUCTION_DEPLOYMENT_PLAN.md`): one external
Docker network per app, loopback-only published ports, host nginx owning TLS, container names
prefixed per app.

Everything in `prod-server/` is deployed **as-is** — the files in this repository are the source of
truth, not a starting point to be edited on the server. A change made only on the host is lost at
the next deploy and invisible to review.

---

## Status

Steps 1–5 (the artifacts) are complete and verified locally. **Steps 6–8 touch the live server and
have not been run.** They need shell access to webserver and a decision on the domain, and two of
them are effectively irreversible against a live domain — confirm immediately before executing,
even if this plan has been approved as a whole.

| Step | What | State |
|---|---|---|
| 1 | `prod-server/compose.yml` | done — `docker compose config` resolves; missing secrets fail loudly |
| 2 | Mongo replica set + idempotent init | done — same mechanism as local compose, verified there |
| 3 | OTel agent in the API image, enabled only here | done — pinned v2.9.0, matches the sibling app |
| 4 | `infra.sh`, `start`, `backup.sh` | done — written; `backup.sh` not yet run against a live volume |
| 5 | `nginx-abofonsa.conf` | done — `nginx -t` passes |
| 6 | Ship to the server and start the stack | **not run** — needs server access |
| 7 | nginx + certbot | **not run** — needs DNS for web.abofonsa.com pointing here |
| 8 | Backup cron + first restore test | **not run** — needs step 6 |

### Domain

The target is **`web.abofonsa.com`**, confirmed for a production review. Only that host is served:
the apex `abofonsa.com` is deliberately not claimed, because it is a separate hostname that may
already serve something else, and a server block here would take it over for anything resolving to
this host. If the apex should point here too, add it to both `server_name` and the certbot command
as an explicit decision.

Issuing a certificate is rate-limited by Let's Encrypt (5 duplicate certificates per week) and
publishes the hostname to public Certificate Transparency logs, so confirm DNS resolves before
running certbot, not after.

### This is a review deployment

`SITE_INDEXABLE` defaults to `false`, so the site serves `noindex` and a disallow-all `robots.txt`.
That is correct for a review. Flip it to `true` only when this host is the announced public site —
see GO-LIVE-CHECKLIST.md.

---

## 1. One-time server setup

```bash
ssh webserver
mkdir -p ~/webroot/01-healthconnect/abofonsa
```

Copy `prod-server/{compose.yml,infra.sh,start,backup.sh}` there, then:

```bash
cd ~/webroot/01-healthconnect/abofonsa
chmod +x infra.sh start backup.sh
./infra.sh          # creates abofonsanet; warns if the shared `monitoring` network is missing
```

## 2. Secrets

Copy `prod-server/.env.example` to the server as `.env` and fill in all three generated values:

```bash
openssl rand -base64 64 | tr -d '\n'   # JWT_SIGNING_KEY  (HS512 needs >= 64 bytes)
openssl rand -base64 24                # BOOTSTRAP_ADMIN_PASSWORD
openssl rand -base64 32                # ENQUIRY_IP_SALT
chmod 600 .env
```

Generate them **on the server**, not locally — a secret that has been in a local shell history or a
chat log is not a secret. `compose.yml` refuses to start without any of them rather than falling
back to a development default.

## 3. Start the stack

```bash
./start
docker compose --env-file .env -f compose.yml ps    # all three healthy
```

Verify from the server itself, before nginx is involved:

```bash
# The Host header matters: Angular SSR rejects any host outside ALLOWED_HOSTS with a bare 400,
# so a plain `curl 127.0.0.1:8082/` looks broken even when the stack is perfectly healthy.
# nginx sends this header when it proxies; these checks do the same.
curl -sI -H 'Host: web.abofonsa.com' 127.0.0.1:8082/ | head -1        # 200
curl -s     -H 'Host: web.abofonsa.com' 127.0.0.1:8082/api/v1/health  # {"status":"UP",...}
curl -s     -H 'Host: web.abofonsa.com' '127.0.0.1:8082/api/v1/content/site?locale=en' | head -c 200
docker exec hc_abofonsa_mongo mongosh --quiet --eval 'rs.status().myState'   # 1 = PRIMARY
```

The API seeds itself on first boot: the changelog runner creates collections, indexes and the
seeded content, then the bootstrap admin. Re-running `./start` does not re-seed — the runner
records what it has applied in `schemaMigrations`.

## 4. nginx and TLS

```bash
sudo cp nginx-abofonsa.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-abofonsa.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Then, **only once the domain is confirmed and DNS resolves to this host**:

```bash
sudo certbot --nginx -d web.abofonsa.com
```

Certbot rewrites the conf in place, adding the TLS block and the HTTP→HTTPS redirect. Do not
hand-write that block; certbot's own rewrite is what keeps automatic renewal working.

Verify:

```bash
curl -sI https://web.abofonsa.com/ | head -1
curl -s  https://web.abofonsa.com/api/v1/content/site?locale=en | head -c 200
curl -sI http://web.abofonsa.com/ | head -2        # 301 to https
curl -s  https://web.abofonsa.com/robots.txt       # Disallow: /  while under review
```

## 5. Backups

```bash
sudo crontab -e
# alongside the existing cert-renewal entry:
0 2 * * * /home/<user>/webroot/01-healthconnect/abofonsa/backup.sh >> /var/log/abofonsa-backup.log 2>&1
```

Run it once by hand first — a cron entry that has never succeeded is not a backup:

```bash
./backup.sh && ls -la backups/
```

It captures **both** the database and the media volume. They are useless apart: a restored database
without its images renders placeholders, and image files with no documents referencing them are
unrecoverable content.

### Restore (rehearse this before you need it)

```bash
gunzip -c backups/abofonsa_YYYY-MM-DD.archive.gz \
  | docker exec -i hc_abofonsa_mongo mongorestore --archive --drop --quiet

docker run --rm -v hc-abofonsa_media-data:/media -v "$(pwd)/backups:/backups:ro" \
  alpine:3 sh -c 'tar xzf /backups/abofonsa_media_YYYY-MM-DD.tar.gz -C /media'
```

`--drop` replaces existing collections. On a live database that is destructive; restore into a
scratch stack unless you are deliberately rolling back.

---

## Routine deploys

After the first deploy, releases are automated: merging to `main` builds SHA-tagged images, deploys
to staging, smoke-tests it, and waits for a reviewer to approve production
(`.github/workflows/release.yml`).

A manual deploy runs the same `./start` on the server. Which images it pulls is set by the
**channel** — see CONTRIBUTING.md "Deploy channels" for the full table:

```bash
./deploy.sh                    # images built on your machine  -> docker.jojoaddison.net
./deploy.sh --channel github   # images built by GitHub Actions -> ghcr.io/kojoampia
```

Both point the server's `.env` at the right `REGISTRY` **and** `TAG` before restarting, which is the
part that is easy to get wrong by hand. Editing `.env` on the server directly still works, but
change both keys together — they are one setting in two lines:

```bash
cd ~/webroot/01-healthconnect/abofonsa
sed -i 's|^REGISTRY=.*|REGISTRY=ghcr.io/kojoampia|' .env   # only if switching source
sed -i 's|^TAG=.*|TAG=<commit-sha>|' .env                  # full SHA on GHCR, short SHA locally
./start
```

Setting `TAG` alone to a GHCR SHA while `REGISTRY` still names the private registry fails the pull
on an image that was built perfectly well — and fails *after* `.env` is rewritten, so the stack is
then pinned to a tag it cannot start. `./deploy.sh` exists partly to make that unrepresentable.

Pin `TAG` to a SHA rather than leaving it at `latest`. With `latest`, "what is running in
production" has no answer, and a rollback has nothing to roll back to.

### Rolling back

```bash
TAG=<previous-sha> ./deploy.sh --skip-build        # previous image came from the private registry
TAG=<previous-sha> ./deploy.sh --channel github    # previous image came from GHCR
```

Every deploy prints the correct one of these in its summary, chosen from the registry that was
actually live — so the hint cannot suggest a rollback that looks for a full-SHA tag in a registry
that never had it. On the server by hand it is the two `sed` lines above, then `./start`.

Images are immutable and every merged commit has one, so this is fast. What it does **not** undo is
a database migration — the changelog runner only rolls forward. A rollback across a migration needs
a restore.

---

## Things that will bite

- **`docker compose` without `--env-file .env`** silently gets no secrets and fails on the `:?`
  guards. Use `./start`, which passes it.
- **`REGISTRY` and `TAG` move together.** They are one setting split over two lines, and since the
  `github` channel arrived they can disagree. A tag that exists only on GHCR paired with the
  private registry fails the pull; the reverse quietly deploys an older image if that tag happens
  to exist in both. `./deploy.sh` always writes both. If the GHCR packages are private the server
  also needs `docker login ghcr.io` once with a `read:packages` token — without it the pull is
  refused with `denied`, which reads like a missing image rather than a missing credential.
- **The `monitoring` network must exist** before the API starts; it belongs to
  `~/webroot/00-admin/monitoring`. `infra.sh` warns if it is missing.
- **First boot is slow.** The OTel agent's instrumentation adds real startup latency on this
  single-core host — the healthcheck allows 120 s before reporting unhealthy.
- **The API publishes no port.** It is reachable only through the web container's `/api` proxy and,
  on the monitoring network, for scraping. That is deliberate: `/actuator` must not be public.
- **`BOOTSTRAP_ADMIN_PASSWORD` is only meaningful at seed time**, and this catches people out.
  `V008_seed_admin_user` hashes it into the admin record on first boot and is then recorded in
  `schemaMigrations`, so it never runs again. Changing the value in `.env` afterwards does nothing;
  a container started later can carry a valid-looking value that has no relationship to the stored
  hash. Only the BCrypt hash is ever persisted, so a lost bootstrap password is lost for good.

  If nobody can sign in, reset the account rather than hunting for the old value. This **deletes**
  the unusable admin so the seeder recreates it from the current `.env`:

  ```bash
  ssh webserver "docker exec hc_abofonsa_mongo mongosh abofonsa --quiet --eval '
    db.adminUsers.deleteMany({username: \"admin\"});
    db.schemaMigrations.deleteOne({_id: \"V008_seed_admin_user\"});'"
  ssh webserver 'cd ~/webroot/01-healthconnect/abofonsa && docker compose --env-file .env -f compose.yml restart api'
  ```

  The recreated account keeps `mustChangePassword=true`, so first login still has to rotate it.
  Other admin users are untouched. `./deploy.sh --recover` now probes this and says so explicitly
  rather than handing over a password that cannot work.

- **A container name with underscores makes Tomcat answer 400.** `hc_abofonsa_api` is not a legal
  hostname, so `curl http://hc_abofonsa_api:8080/...` from inside the network is rejected before
  Spring sees it, with an HTML error page rather than our problem document. Address the API by its
  compose service alias — `http://api:8080` — when testing from another container.

- **Rotate `BOOTSTRAP_ADMIN_PASSWORD` at first login.** The account is created with
  `mustChangePassword=true`, so the CMS forces it — the go-live checklist confirms it was done.
