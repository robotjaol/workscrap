# Architecture

Career Pulse is a local-first Manifest V3 browser extension built with standard
JavaScript, HTML, and CSS. It has no application server and loads no remote
code.

## Runtime flow

```text
Browser alarm or manual check
           |
           v
Manifest V3 service worker
           |
           +----> ATS/API scraper ----> normalized jobs
           |
           +----> HTML fetch ----> offscreen DOM parser ----> normalized jobs
                                      |
                                      v
                           snapshot comparison
                                      |
                         unseen jobs only after baseline
                                      |
                                      v
                           Telegram Bot API + local history
```

The first successful response for a source becomes its baseline. Later job IDs
are compared against that snapshot. A new ID is sent to Telegram and added to
the rolling local history. Delivered IDs are merged into the snapshot.

## Components

| Path | Responsibility |
| --- | --- |
| `background/service-worker.js` | Scheduling, polling orchestration, state transitions, and message handling |
| `background/scrapers/` | Source-specific fetching and normalization |
| `background/diff-engine.js` | Pure baseline and snapshot comparison functions |
| `background/storage.js` | Typed storage boundaries and retention limits |
| `background/telegram-client.js` | Telegram request and message formatting |
| `background/html-parser.js` | Service-worker bridge to the offscreen parser |
| `offscreen/` | DOM parsing for fetched HTML, which a service worker cannot do directly |
| `options/` | Telegram, source, permissions, and directory configuration UI |
| `popup/` | Monitoring summary, recent alerts, and manual checks |
| `lib/` | Shared configuration validation and directory data |
| `tests/` | Deterministic tests with browser and network mocks |
| `scripts/` | Repository validation and distributable build creation |

## Data model

All state lives in `chrome.storage.local` under five keys:

- `config`: Telegram settings and source definitions;
- `snapshots`: up to 500 previously delivered or baselined job IDs per source;
- `sourceState`: polling timestamps, failures, counts, and warnings;
- `alerts`: the 50 most recent successfully sent alerts; and
- `activity`: a small summary used by the popup.

No schema migration layer exists yet. Changes to persisted structures must be
backward compatible or include an explicit migration before the version is
released.

## Scheduling and failure behavior

Each enabled source has a one-shot browser alarm. A completed scheduled check
creates the next alarm. Initial intervals are randomized to reduce synchronized
traffic. Failures use exponential backoff capped at 120 minutes. HTML selectors
that return no jobs trigger a Telegram warning after two consecutive checks.

Manifest V3 service workers are ephemeral, so durable state must remain in
browser storage rather than module-level variables. The in-memory running-source
set prevents duplicate work only within a single worker lifetime.

## Extension boundaries

- Scrapers must return normalized jobs and must not write storage directly.
- The diff engine remains browser-independent and deterministic.
- UI modules may validate and save configuration but do not poll career sites.
- Network access requires a declared or user-approved host permission.
- New permissions require security review and documentation.
