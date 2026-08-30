# Development guide

## Prerequisites

- Node.js 20 or newer for checks and tests
- Brave, Google Chrome, or Microsoft Edge for manual extension testing
- Git

The extension itself has no third-party runtime dependencies and no compilation
step.

## Set up the repository

```shell
git clone https://github.com/robotjaol/workscrap.git
cd workscrap
npm install
npm run verify
```

`npm run verify` checks repository structure and JavaScript syntax, runs the
mocked test suite, and builds a clean unpacked extension in
`dist/career-pulse`.

## Load the development extension

1. Open the browser's extension management page.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select the repository root for direct development, or
   `dist/career-pulse` to test the packaged file set.
5. After a code change, return to the extension management page and reload the
   extension.

Use the extension service worker inspector for background logs. Use the normal
page inspector for popup and settings UI changes.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run check` | Validate manifest metadata, repository files, HTML language, links, and JavaScript syntax |
| `npm test` | Run deterministic unit and integration-style tests with mocks |
| `npm run build` | Create a clean unpacked extension under `dist/` |
| `npm run verify` | Run all required local and CI checks |
| `npm run test:links` | Perform the optional network-based company link audit |

The live link audit is intentionally excluded from CI because employer sites
frequently rate-limit automation, block data-center traffic, or change without a
project code change.

## Manual test checklist

- Load the extension without manifest errors.
- Save a Greenhouse or Lever source and confirm the permission flow.
- Run the first check and confirm it creates a baseline without alerts.
- Run a second check with a mocked or known new job and confirm one Telegram
  message and one local history entry.
- Confirm invalid URLs and incomplete selectors show actionable errors.
- Confirm the popup accurately reports enabled sources and recent alerts.
- Confirm removing a source also removes its snapshot and state after saving.

Use a dedicated Telegram bot and test chat. Never use production or personal
secrets in fixtures or commits.
