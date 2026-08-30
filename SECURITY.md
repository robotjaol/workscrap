# Security Policy

## Supported versions

Career Pulse is currently maintained on the `main` branch. Until formal releases
are published, security fixes are applied there.

## Reporting a vulnerability

Do not open a public issue for a vulnerability or include secrets in an issue,
pull request, screenshot, or test fixture.

Use GitHub's private vulnerability reporting feature on this repository when it
is available. If that option is unavailable, contact the repository owner
through their public GitHub profile and ask for a private reporting channel.

Include:

- the affected component and commit;
- clear reproduction steps;
- the expected security impact;
- any proof of concept with sensitive values removed; and
- a suggested mitigation, if known.

Please allow maintainers reasonable time to investigate before public
disclosure. Receipt and remediation timelines depend on maintainer availability;
no fixed response SLA is promised.

## Security model

Career Pulse runs locally as a Manifest V3 browser extension. It stores the
Telegram bot token, chat ID, source configuration, job snapshots, source state,
and recent alert history in `chrome.storage.local`. Browser extension storage is
not an encrypted secret vault; anyone with access to the browser profile may be
able to read it.

The extension sends requests directly to configured career sources and the
Telegram Bot API. It has no project-operated backend, analytics service, or
remote code loader.

Use a dedicated Telegram bot, grant access only to trusted HTTPS career hosts,
and revoke the token immediately if it is exposed.
