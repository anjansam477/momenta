# Momenta — Enhancement & Improvement Backlog

A full-project audit: visual, functional, architectural, security, performance, and
new-feature ideas. Each item is tagged with **priority** (P0 critical → P3 nice-to-have),
**effort** (S/M/L), and a **why**.

> Legend — P0: do soon (correctness/security/cost). P1: high ROI. P2: solid improvement.
> P3: polish / future. Effort — S: <½ day, M: 1–2 days, L: 3+ days.

## ✅ Completed (P0 round)

- **Durable scheduled-mail poller** (was D1/D2) — replaced the in-process `setTimeout`
  (which never survived a restart and couldn't work across instances) with a 1-minute
  `node-cron` poller that **atomically claims** each due job (`pending → sending`), so
  multiple API instances are safe and restarts resume from the DB. Adds retry/requeue.
  Covered by `backend/test/mail-service.test.js`.
- **Server-side post sanitization** (was B2) — rich post content is now sanitized on
  write via `sanitize-html` (`backend/src/utils/sanitize-content.js`), stripping
  `<script>`, `onerror`/`on*` handlers and `javascript:` URLs while keeping Quill
  formatting + inline images. Stored content is safe regardless of render path.
  Covered by `backend/test/sanitize-content.test.js`.
- **Reactions storage** (was B1/I1) — *finding corrected:* reactions are already a
  dedicated `reactions` collection with a unique `(postId,userEmail,type)` index and
  Redis-cached counts (the embedded array is only a read projection). The remaining
  gap — a `findOne`-then-`create` race that could 500 on the unique index — was fixed
  with an idempotent insert that only counts genuine inserts.

---

## A. Dead code & dependency cleanup — highest ROI, do first

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| A1 | ✅ Delete `DownloadService` + drop `html2canvas` & `jspdf` | — | — | **Done.** Service deleted; both deps removed. |
| A2 | ✅ Drop `ngx-material-timepicker` | — | — | **Done.** Removed. |
| A3 | ✅ Delete orphaned `add-user` / `add-domain` and drop `ngx-chips` | — | — | **Done.** Components + specs deleted, `ngx-chips` + its dark-mode CSS removed. |
| A4 | ✅ Consolidate date libraries (partial) | — | — | **Done.** `luxon` (frontend, unused) and `moment` (backend, migrated to date-fns in `event-controller`) removed. date-fns is now the single date lib. |
| A5 | ✅ Remove duplicate Google OAuth strategy | — | — | **Done.** `passport-google-oauth20` removed (only `-oauth2` is used). |
| A6 | Evaluate `jquery` + `slick-carousel` | P2 | M | jQuery is a heavy legacy dep pulled in only for the carousel. Replace with a CSS scroll-snap / Angular carousel and delete jQuery. *(still pending)* |
| A7 | ✅ Re-check `responsive-img.directive` canvas hack | — | — | **Done.** Stale html2canvas comment updated. |

**Net effect:** **7 dependencies removed** (html2canvas, jspdf, ngx-material-timepicker, ngx-chips, luxon, moment, passport-google-oauth20) + 3 dead component/service dirs deleted. Smaller install, fewer CVE surfaces, cleaner repo. Backend 86/86 tests pass, frontend builds clean (2.51 MB).

---

## B. Security & data integrity

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| B1 | ✅ Reactions storage | — | — | **Done / corrected.** Already a dedicated `reactions` collection (unique index + Redis counts); fixed only the create-race. See Completed section. |
| B2 | ✅ Server-side HTML/content sanitization for posts | — | — | **Done.** `sanitize-html` allow-list applied on write. See Completed section. |
| B3 | ✅ Confirm prod Mongo auth + not public | — | — | **Verified secure.** `docker-compose.prod.yml`: `mongod --auth --keyFile`, root creds, `authSource=admin`, and `expose:` (not `ports:`) → 27017 is internal-only. Also **pinned prod `mongo:latest` → `mongo:7.0`** (was the same major-version data-break risk we fixed in dev). |
| B4 | ✅ View-token revocation story | — | — | **Done.** Per-wall receiver-link epoch (`walls.viewTokenVersion`). Tokens embed the epoch at mint; `verifyToken` (View branch) + `viewReceiverWall` reject links minted before a rotation. `POST /api/walls/:wallId/rotate-view-links` (owner/maintainer) bumps the epoch → invalidates **only that wall's** shared links, leaving every other wall untouched. Both the verify side and the mint side fail **open** on a DB hiccup (metric `momenta_view_token_version_check_failures_total`), and unversioned legacy links stay valid (epoch 0). Covered by `backend/test/view-token.test.js` (6 cases). |
| B5 | Audit every mutating endpoint for rate-limit + authz | P1 | M | **Audited — gaps found (below).** Most endpoints are well-guarded (post/wall routes have `verifyToken` + role checks; auth routes have specific limiters). Real holes ↓ |
| B5a | ✅ `POST /api/uploads/media` unauthenticated | — | — | **Fixed.** Now `verifyToken` (accepts Bearer + View) + `uploadLimiter` (30/min/user). GET `/retrieve-file` stays public so `<img>` tags still load. |
| B5b | ✅ Mail `DELETE /remove` & `/cancel` IDOR | — | — | **Fixed.** Added `authorizeApproval` (owner/maintainer of the wall) to both. |
| B5c | ✅ `PUT /profile/picture/:userId` missing auth | — | — | **Fixed.** Added `verifyToken` (now matches `PUT /:userId`). |
| B5d | ✅ Missing rate-limiters | — | — | **Fixed.** `send-mail` → `scheduleMailLimiter`, `password/update` → `forgotPasswordLimiter`, giphy `analytics/action` → `giphyLimiter`. |
| B5e | ✅ `validateUserById` enforces caller == target | — | — | **Done.** `validateUserById` now rejects (403) when `req.email` (the verified caller) ≠ the target user's email, closing the IDOR on `PUT /:userId`, `DELETE /:id`, and profile-picture. See `user-validations.js`. |
| B6 | ✅ Secrets & `.env` hygiene | — | — | **Verified clean.** `.env` is gitignored (`.env` + `.env.*`, with `!.env.example` re-included); only `.env.example` is tracked and it holds `change-me` placeholders only — no real secrets. `.env.example` over-documents every key the app reads. Source grep found no hardcoded secrets. No code change needed. |

---

## C. Performance — frontend

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| C1 | ✅ Lazy-load heavy modals (emoji-mart, image-cropper, GIF/sticker pickers) | — | — | **Done.** Wrapped the heavy, user-action-gated widgets in `@defer (on immediate)` inside their existing `@if` gates (postmodal + settingsmodal). Build now emits `ngx-image-cropper` (86 kB) + emoji/gif/sticker as **separate on-demand lazy chunks** — off the wall page's first-render path; each loads on first use behind a tiny placeholder. **Quill left eager on purpose**: its `editorRef.quillEditor` is wired in `ngAfterViewInit` (text-change listener), so deferring it would break the editor. |
| C2 | Refactor the 4,800-line global `styles.css` | P1 | L | A monolith of global rules with pervasive `!important` dark-mode overrides. Slow to parse, fragile, hard to reason about. Migrate to design tokens (CSS variables) + component-scoped dark mode (the pattern `access-editor` and `download-wall` already use). |
| C3 | ✅ Off-screen card windowing for large walls | — | — | **Done (masonry-compatible).** *Finding:* the feed is a custom 3-column masonry (`columns: Post[][]` balanced by `estimatedHeight`); CDK `cdk-virtual-scroll-viewport` only windows a single linear list and would destroy the masonry, so it's the wrong tool here. Instead applied CSS `content-visibility: auto` to `.post` with a per-card `contain-intrinsic-block-size` bound from the existing `estimatedHeight` — the browser skips layout/paint of off-screen cards (a 500-post wall no longer does 500 cards' worth of render work) while keeping the masonry and the DOM intact, no scroll-jump. |
| C4 | Audit manual `detectChanges()` calls | P2 | M | **Not a blind swap — reclassified.** ~40 call sites; `wall-posts` (~18) uses sync CD for DOM height measurement, so blanket `markForCheck()` would break it. Do this *within* the E1 split, per-call. |
| C5 | ✅ Image `loading="lazy"` + `decoding="async"` | — | — | **Done.** Heavy images (dashboard cards) already had it; added to the repeated avatar lists (access-editor, user-replacer). Logos/spinners/print/slideshow left eager on purpose. |
| C6 | ✅ Preconnect / font-display | — | — | **Already in place.** `index.html` has `preconnect` to Google Fonts + `display=swap`; bootstrap-icons is bundled locally. API preconnect skipped (origin is env-specific). |

---

## D. Performance & reliability — backend

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| D1 | ✅ Durable scheduled-mail poller | — | — | **Done.** `node-cron` poller replaces in-process timers. See Completed section. |
| D2 | ✅ Atomic job claim to prevent double-send | — | — | **Done.** `claimDueJob` does `findOneAndUpdate pending→sending`. See Completed section. |
| D3 | ✅ Counter cache reconciliation cadence | — | — | **Verified, no change.** Drop-and-rebuild reconciler runs every 6h (env-configurable, disable flag, non-blocking SCAN, logs success/failure). No drift number to threshold by design. |
| D4 | ✅ DB indexes review | — | — | **Verified, already comprehensive.** posts `{wallId,status,createdAt}` + pinned variant, mailjobs `{status,scheduledAt}`, wallmembers `{wallId,userEmail,role}`, reactions/saved-walls/analytics/interactions all covered. Nothing to add. |

---

## E. Architecture & code quality

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| E1 | 🟡 Split the `wall-posts` god component (services extracted; PostCard pending) | P2 | M | **Partial — the safe, high-value half.** Extracted the two self-contained concerns into injectable services: **`MasonryLayoutService`** (`estimatePostHeight` / `getColumnHeight` / `getShortestColumn` — pure, unit-tested via `masonry-layout.service.spec.ts`) and **`PostMediaService`** (`isImage`/`isVideo`/`isGif` + blob `resolve`). Component delegates to both; dropped dead `arrayBufferToBlob` + 3 now-unused rxjs imports. **Remaining (deferred):** the presentational `PostCard` split touches the fragile bootstrap-dropdown + parent change-detection timing (the C4 `detectChanges` territory) and needs interactive QA — it should be its own focused pass, not a compile-only change. |
| E2 | Finish migrating off the `SharedDataService` facade | P2 | M | It's an intentional backwards-compat facade over Ui/User/Wall/Post stores. New code should inject the focused store directly; migrate the ~30 consumers incrementally, then delete the facade. |
| E3 | Remove deprecated Post compat fields | P2 | M | `mediaUrl`, `firstName`, `lastName`, `isArchived`, etc. are `@deprecated` shims. Once the API is fully on the new schema, drop them to simplify templates. |
| E4 | Centralize magic strings | P3 | S | Roles, reaction types, statuses appear as string literals in places. Promote to shared enums/consts (some already exist) for type-safety. |
| E5 | ✅ Consistent error handling | — | — | **Done.** Swapped the bare `console.error` HTTP-error paths (`settings`, `postmodal`) to `handleHttpError` (user now sees a toast). Audio autoplay-rejection logs + graceful media-fallback log left as-is (not HTTP, console is correct). |

---

## F. Testing

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| F1 | Upgrade smoke tests to behavior tests | P1 | L | Nearly every component/service has a spec, but most are "should create" only. Add real assertions for: reactions, access-control guards, post creation, auth interceptor, scheduling (done), download mapping. |
| F2 | Backend service/controller tests | P1 | M | Only a handful of backend unit tests exist. Add coverage for wall/post/access controllers and services (mock repos like the new `mail-service.test.js`). |
| F3 | E2E critical journeys (Playwright is configured) | P2 | M | Create wall → post → react → schedule → download. Catches regressions the unit smoke tests can't. |
| F4 | ✅ CI gate | — | — | **Already in place** — `.github/workflows/ci.yml` runs backend lint+test, frontend lint+build, and Playwright E2E smoke on every push/PR. |

---

## G. Accessibility & UX / visual polish

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| G1 | Modal focus management & keyboard traps | P1 | M | Bootstrap modals already trap/restore focus + Escape-dismiss. *Remaining:* the custom side panels (settings/schedule/background) should trap focus too. *(pending)* |
| G2 | ✅ Refine the global `:focus-visible` outline | — | — | **Done.** Dropped the heavy double box-shadow for a single crisp 2px keyboard-only ring. |
| G3 | Color-contrast pass for dark mode | P2 | M | Teal-on-dark muted text (`#6B8AA3`, `#9BB0C4`) — verify WCAG AA against the actual backgrounds. *(pending)* |
| G4 | Consistent loading skeletons & empty states | P2 | M | Some lists flash or jump. Skeletons for posts/dashboard + unified empty-state component. *(pending)* |
| G5 | ✅ `prefers-reduced-motion` support | — | — | **Done.** Global media query neutralises animations/transitions; JS confetti is gated in the animation service. |
| G6 | ✅ Button micro-interactions (partial) | — | — | **Done.** Subtle motion-safe press on buttons/CTAs. *Remaining:* reaction press/spring + optimistic post UI (lives in the `wall-posts` refactor, E1). |
| G7 | Mobile pass | P2 | M | Verify the settings/schedule/share modals and the wall grid at 360–420px widths. *(pending)* |

---

## H. Observability & DevOps (already strong)

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| H1 | Keep the excellent base | — | — | Prometheus, Grafana, actuator health, pino logging, request-context correlation, graceful shutdown, Redis-backed sessions/limiters — this is genuinely above-average. |
| H2 | ✅ Alerting rules | — | — | **Done.** `monitoring/alerts.yml` (APIDown, HighHttp5xxRate, HighRequestLatencyP95, HighProcessMemory) wired via `rule_files` in prometheus.yml + mounted in both compose files. |
| H3 | Dashboards for the mail pipeline | P3 | S | Now that scheduling is durable, chart pending/sent/failed jobs. |

---

## I. Data model / scalability

| # | Item | P | Effort | Why |
|---|------|---|--------|-----|
| I1 | ✅ Reactions collection | — | — | **Already in place** — see B1 / Completed section. |
| I2 | Soft-delete & audit trail | P3 | M | Posts have a `deleted` status; ensure deletes are soft + auditable (who/when) for moderation. |
| I3 | ✅ Media lifecycle / cleanup | — | — | **Done (log-only by default).** `jobs/media-cleanup.js` sweeps `media-files/` for blobs no post references, skips webp variants of live images + files <24h old. Reports the orphan count; **deletion gated behind `ENABLE_MEDIA_CLEANUP_DELETE=true`** so ops validates the logs first. Pure matcher unit-tested (5 cases). |

---

## J. New feature ideas (secondary — after the above)

| # | Idea | Why it fits |
|---|------|-------------|
| J1 | Public read-only share link for a finished wall | Pairs perfectly with the new memory/export page — a recipient could view online, not just PDF. |
| J2 | Image export of the memory (PNG) in addition to print-PDF | Some users want a shareable image, not a document. |
| J3 | Recurring / timezone-aware scheduled delivery | "Every birthday", or send at 9am in *each recipient's* timezone. |
| J4 | Post comments / threaded replies | Deepens engagement on a moment. |
| J5 | Wall templates & themes gallery | Faster wall creation; showcases the theming system. |
| J6 | Search across a wall's posts | Useful once a wall has hundreds of messages. |
| J7 | Digest notification emails | Daily/weekly summary instead of per-event. |
| J8 | PWA / installable + offline read | Memory walls are revisited; offline viewing is a delight. |

---

## Suggested sequencing

1. **Week 1 — quick wins:** A1–A3 (dead deps), B1/B2 (reaction storage + sanitization audit), F4 (CI gate).
2. **Week 2 — reliability:** D1/D2 (durable scheduler), C3 (virtual scroll), E1 start (split wall-posts).
3. **Week 3 — polish:** C2 (styles tokenization), G1–G4 (a11y + loading states), F1/F2 (real tests).
4. **Later:** J-series features once the foundation is tightened.
