# Career Pulse

[![CI](https://github.com/robotjaol/workscrap/actions/workflows/ci.yml/badge.svg)](https://github.com/robotjaol/workscrap/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Career Pulse is a local-first Chromium extension that monitors career portals
and sends newly discovered jobs to Telegram. It runs entirely in the browser:
there is no project-operated backend, subscription, analytics service, build
requirement, or AI API.

The extension is designed for personal job discovery. It supports public
Greenhouse and Lever job-board APIs, configurable Workday CXS endpoints, and
CSS-selector-based HTML sources for other public career pages.

## Why Career Pulse

- **Local-first:** configuration, snapshots, status, and alert history remain in
  the browser profile.
- **Explainable detection:** a stable job ID that was not present in the prior
  snapshot is considered new.
- **Quiet first run:** the first successful check creates a baseline instead of
  sending every existing vacancy.
- **Responsible scheduling:** checks are randomized and repeated failures back
  off exponentially, up to 120 minutes.
- **No runtime dependencies:** the extension uses standard JavaScript, HTML,
  CSS, browser APIs, and the Telegram Bot API.
- **Curated discovery:** the settings page includes links for 80 employers
  across energy, mining, technology, FMCG, and manufacturing.

## How it works

```text
Browser alarm or manual check
          |
          v
Fetch ATS API or public career page
          |
          v
Normalize jobs -> compare job IDs -> update local snapshot
                                  |
                                  v
                        Send new jobs to Telegram
```

The Manifest V3 service worker schedules one-shot browser alarms for enabled
sources. HTML pages are parsed in an offscreen document because service workers
do not provide DOM APIs. The browser must remain running for scheduled checks;
no career tab needs to stay open.

See [the architecture guide](docs/architecture.md) for component boundaries,
storage keys, and failure behavior.

## Requirements

- Brave, Google Chrome, Microsoft Edge, or a compatible Chromium browser based
  on Chromium 109 or newer
- A Telegram account, bot token, and destination chat ID
- At least one public career source

Node.js is only required for repository development and automated checks.

## Install from source

1. Download the repository as a ZIP archive or clone it:

   ```shell
   git clone https://github.com/robotjaol/workscrap.git
   ```

2. Extract the ZIP if needed.
3. Open the browser's extension management page:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode**.
5. Choose **Load unpacked**.
6. Select the repository root—the folder that directly contains
   `manifest.json`.
7. Pin Career Pulse and open **Settings**.

Do not select a ZIP file or the repository's parent folder. Unpacked extensions
must be reloaded manually after an update.

## Configure Telegram

1. Open the verified [BotFather](https://t.me/BotFather) account in Telegram.
2. Send `/newbot` and follow the prompts.
3. Keep the returned bot token private.
4. Open a chat with the new bot, press **Start**, and send a message.
5. Open the following URL after replacing `YOUR_TOKEN`:

   ```text
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```

6. Find the numeric value in `message.chat.id`.
7. Enter the token and chat ID in Career Pulse Settings.
8. Select **Test connection**, then **Save settings**.

For a group, add the bot to the group, send a group message, and inspect
`getUpdates` again. Group chat IDs are commonly negative numbers.

The bot token is stored in `chrome.storage.local`. Browser extension storage is
not an encrypted secret vault, so use a dedicated bot and protect access to the
browser profile. Revoke exposed tokens through BotFather immediately.

## Add a source

### Greenhouse

For a board such as `https://boards.greenhouse.io/examplecompany`, enter
`examplecompany` as the board token. Career Pulse uses Greenhouse's public job
board endpoint; no Greenhouse API key is required.

### Lever

For `https://jobs.lever.co/examplecompany`, enter `examplecompany` as the
company slug. Career Pulse uses Lever's public postings endpoint; no Lever API
key is required.

### Workday

Workday endpoints differ by tenant and career site. Open the career page's
browser Network panel, find the job-list request containing `/wday/cxs/` and
ending in `/jobs`, and paste the complete HTTPS endpoint. A typical endpoint is:

```text
https://company.wd3.myworkdayjobs.com/wday/cxs/company/site/jobs
```

### Custom HTML and Taleo

These source types fetch a public HTTPS page and extract jobs with CSS selectors:

- **Item selector** identifies one complete job card or row.
- **Title selector** finds the title within that item.
- **Link selector** finds the application link.
- **Department selector** is optional.
- **ID selector** is optional; without one, Career Pulse hashes the title and
  application URL.

For example:

```html
<article class="job-card" data-job-id="123">
  <h2 class="job-title">Field Engineer</h2>
  <span class="department">Operations</span>
  <a class="job-link" href="/jobs/123">Apply</a>
</article>
```

Use `.job-card`, `.job-title`, `a.job-link`, `.department`, and
`[data-job-id]` respectively.

The Taleo adapter currently uses the same configurable HTML parser as Custom
HTML; it is not a universal Taleo API integration. HTML monitoring cannot parse
jobs rendered only after client-side JavaScript runs, and selectors may break
when a site is redesigned. Career Pulse sends a warning after two consecutive
checks find no matching items.

## Company directory

The settings page contains a searchable directory of 80 employer career pages
and an additional Indonesian job resource. Directory entries help users find a
career site or prefill a Custom HTML source; they do not include working CSS
selectors automatically.

Links change over time, and some job-list actions lead to an employer's selected
recruiting platform. Inclusion does not imply affiliation, endorsement, or a
guarantee that automated access is allowed. Verify vacancies on the employer's
official site before applying.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `alarms` | Schedule source checks while the browser is running |
| `storage` | Save configuration, snapshots, status, and recent alerts locally |
| `offscreen` | Parse fetched HTML with browser DOM APIs |
| Fixed Greenhouse, Lever, and Telegram hosts | Reach supported public APIs without a separate prompt |
| Optional HTTPS hosts | Fetch a Workday, Taleo, or Custom HTML source after user approval |

Career Pulse does not request access to normal page contents, browsing history,
cookies, downloads, or tabs. Configurable sources are restricted to HTTPS.

## Privacy and security

Career Pulse stores the following in the local browser profile:

- Telegram bot token and chat ID
- source configuration
- job ID snapshots, limited to 500 per source
- source status and error messages
- the 50 most recent successfully sent alerts

Career requests go directly from the browser using the user's network
connection. Alert messages pass through Telegram's infrastructure. Career Pulse
has no analytics, advertising, remote application server, or remote code loader.

Do not configure private pages, authenticated applicant portals, browser
cookies, passwords, or private API keys as sources. See the full
[security policy](SECURITY.md) for the reporting process and threat model.

## Known limitations

- Scheduled monitoring stops when the browser is fully closed.
- Browser and operating-system power policies may delay alarms.
- A career site may block automated requests, require authentication, enforce
  rate limits, or prohibit scraping in its terms.
- Custom HTML sources cannot execute a site's JavaScript before parsing.
- Upstream ATS response formats and career-page selectors can change without
  notice.
- Detection depends on stable IDs or stable title-and-link hashes; unstable
  upstream identifiers can produce duplicate alerts.
- Telegram is currently the only notification channel.

## Troubleshooting

### The Telegram test does not arrive

Confirm that the bot chat was started, the complete token was copied, and the
chat ID is correct. Send the bot a fresh message and inspect `getUpdates` again.

### A source returns HTTP 403 or 429

The site is denying or rate-limiting automated requests. Do not attempt to
bypass its controls. Allow the built-in backoff to run, review the site's terms,
and prefer a supported public ATS endpoint when one is available.

### A custom source finds no jobs

Inspect the raw HTML response and recheck the item, title, and link selectors.
If the page renders jobs with JavaScript, look for a public ATS or JSON request
in the Network panel instead.

### Workday stopped working

Locate the current CXS request again. The employer may have changed its tenant,
site name, or public endpoint.

### Automatic checks do not run

Keep the browser running, confirm the source is enabled, and check whether
battery or enterprise policies have suspended the extension.

For detailed errors, open the extension management page and inspect the Career
Pulse service worker. Remove all tokens, chat IDs, and personal data before
sharing logs.

## Development

Career Pulse has no third-party runtime or development packages. Node.js 20 or
newer is used for repository checks, mocked tests, and distribution assembly.

```shell
npm install
npm run verify
```

The verification command checks manifest and repository invariants, validates
JavaScript syntax, runs deterministic tests without real network credentials,
and creates a clean unpacked extension in `dist/career-pulse`.

See [docs/development.md](docs/development.md) for the complete workflow. A live
directory link audit is available through `npm run test:links`, but is excluded
from CI because employer sites often block automated infrastructure.

## Project structure

```text
.github/               GitHub workflows and collaboration templates
background/            Service worker, storage, delivery, and scrapers
docs/                  Architecture and development guides
lib/                   Shared validation and directory data
offscreen/             DOM-based HTML parser
options/               Settings and company directory UI
popup/                 Status and manual-check UI
scripts/               Repository checks and distribution build
tests/                 Deterministic mocked tests and optional link audit
manifest.json          Chromium extension manifest
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), follow the
[Code of Conduct](CODE_OF_CONDUCT.md), and run `npm run verify` before opening a
pull request. Use [SECURITY.md](SECURITY.md) for private vulnerability reports.

## Responsible use

Public visibility does not automatically permit automated access. Review each
site's terms and robots guidance, use conservative intervals, and never bypass
authentication, bot protection, or rate limits. Career Pulse is intended for
personal job discovery, not bulk harvesting or commercial redistribution.

## License

Career Pulse is available under the [MIT License](LICENSE).
