# Contributing to Career Pulse

Thank you for considering a contribution. Career Pulse is intentionally small,
local-first, and dependency-light. Contributions should preserve those
qualities unless there is a clear, documented reason to change them.

## Before you start

- Search existing issues and pull requests before opening a new one.
- Use a discussion or feature request for changes that affect permissions,
  stored data, polling behavior, or the supported ATS model.
- Do not include real Telegram tokens, chat IDs, private career pages, session
  cookies, or applicant information in reports, fixtures, or screenshots.

## Development workflow

1. Fork the repository and create a focused branch from `main`.
2. Install Node.js 20 or newer. There are no third-party package dependencies.
3. Run `npm install` to validate the local Node.js version and create a standard
   npm workspace.
4. Make the smallest coherent change that solves the issue.
5. Run `npm run verify` before opening a pull request.
6. Load either the repository root or `dist/career-pulse` as an unpacked
   extension and test the affected browser flow manually.

See [docs/development.md](docs/development.md) for the full local workflow and
[docs/architecture.md](docs/architecture.md) for component boundaries.

## Pull request expectations

A pull request should:

- explain the problem and the chosen solution;
- include or update automated tests for behavior changes;
- document user-visible changes;
- avoid unrelated formatting or refactoring;
- keep the manifest permissions as narrow as practical; and
- pass all continuous integration checks.

Maintainers may ask for a change to be split when review, rollback, or release
risk would be clearer as separate pull requests.

## Adding or changing a scraper

Scrapers return normalized job objects with `id`, `title`, `department`, `url`,
and `publishedAt` fields. Prefer a documented public JSON endpoint over HTML
scraping. Add deterministic tests with mocked network responses and document any
new host permission.

Do not add bypasses for authentication, bot protection, rate limits, or a
site's access controls.

## Updating the company directory

Use official employer career pages whenever possible. Keep entries factual and
do not imply that an employer endorses Career Pulse. Run `npm test` for static
directory validation. The optional live link audit can be run with
`npm run test:links`; transient blocks and rate limits require human review.

## Community standards

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
Security reports must follow [SECURITY.md](SECURITY.md) instead of public issue
reporting.
