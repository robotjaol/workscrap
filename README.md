# Career Pulse

Career Pulse is a Chrome and Microsoft Edge extension that checks company career portals for newly published jobs and sends alerts to Telegram.

It runs entirely inside your browser. There is no backend server, subscription service, build step, or AI API requirement.

## Do I need an AI API?

No. You do not need OpenAI, ChatGPT, Gemini, Claude, or any other AI API.

Career Pulse uses a simple, explainable process:

1. The browser checks a configured career portal.
2. A scraper converts the response into a small list of jobs.
3. The extension compares those job IDs with its previous snapshot.
4. A job with an unseen ID is treated as new.
5. The company, job title, department, and application link are sent to Telegram.

The only external API you normally configure is the Telegram Bot API. Greenhouse and Lever also expose public job-board APIs, but they do not require you to create an API key.

## What you need

Prepare the following before starting:

* Google Chrome or Microsoft Edge
* The downloaded `extension` folder
* A Telegram account
* A Telegram bot token from BotFather
* Your Telegram chat ID
* At least one career source

Node.js is not required to use the extension. It is only needed if you want to run the automated development tests.

## How it works

Career Pulse uses a Manifest V3 service worker and the browser alarm system. The worker wakes when an alarm fires, fetches a source, checks for unseen job IDs, saves its state in `chrome.storage.local`, and goes back to sleep.

The browser must remain running. It may be minimized and no career tab needs to stay open. Closing the browser stops monitoring until the browser is opened again.

Each source has its own randomized schedule. Custom HTML sources are kept near the slower end of the polling range. Repeated failures trigger exponential backoff up to 120 minutes.

The first successful check creates a baseline without sending every existing vacancy. Only jobs that appear after that baseline are treated as new.

## Install in Chrome

1. Download or clone this repository.
2. Open Chrome.
3. Enter `chrome://extensions` in the address bar.
4. Turn on Developer mode.
5. Click Load unpacked.
6. Select the folder containing `manifest.json`.
7. Pin Career Pulse from the extensions menu.
8. Open Career Pulse and click Settings.

If Chrome reports a manifest error, confirm that you selected the `extension` folder itself rather than its parent folder.

## Install in Microsoft Edge

1. Open Edge.
2. Enter `edge://extensions` in the address bar.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select the folder containing `manifest.json`.
6. Open the Career Pulse settings page.

## Create a Telegram bot

Telegram is the notification channel. Career Pulse talks directly to the official Telegram Bot API from your browser.

1. Open Telegram and search for `@BotFather`.
2. Confirm that the account has the official verification mark.
3. Send `/newbot`.
4. Follow the prompts to choose a bot name and username.
5. Copy the token returned by BotFather.
6. Open a chat with your new bot.
7. Press Start or send a normal message such as `hello`.

Your bot cannot send a direct message until you start the conversation first. Keep the bot token private because anyone with the token may control the bot.

## Find your Telegram chat ID

After sending a message to your bot, open this address:

```text
https://api.telegram.org/botYOUR_TOKEN/getUpdates
```

Replace `YOUR_TOKEN` with the token from BotFather. Find the number inside `message.chat.id`:

```json
{
  "message": {
    "chat": {
      "id": 123456789
    }
  }
}
```

For a group chat, add the bot to the group, send a message there, and call `getUpdates` again. Group chat IDs are commonly negative numbers.

## Connect Telegram

1. Open Career Pulse Settings.
2. Paste the token into Bot token.
3. Paste the chat ID into Chat ID.
4. Click Test connection.
5. Confirm that Telegram receives the test message.
6. Click Save settings.

The token and chat ID are stored in `chrome.storage.local` inside your browser profile. They are not committed to the repository or sent to an application backend because no application backend exists.

If a token is exposed, revoke it through BotFather and replace it in the extension immediately.

## Add a Greenhouse source

Greenhouse is the simplest source because it provides a public JSON endpoint.

If a company URL is:

```text
https://boards.greenhouse.io/examplecompany
```

The board token is `examplecompany`.

1. Click Greenhouse under Career sources.
2. Enter the company name.
3. Enter the board token.
4. Choose a minimum interval.
5. Keep the source enabled.
6. Save the settings.

No Greenhouse API key is required.

## Add a Lever source

If a company URL is:

```text
https://jobs.lever.co/examplecompany
```

The company slug is `examplecompany`.

1. Click Lever under Career sources.
2. Enter the company name and slug.
3. Choose the interval.
4. Save the settings.

No Lever API key is required.

## Add a Workday source

Workday endpoints vary between companies. The visible career-page URL is normally not enough.

1. Open the company Workday career page.
2. Open Developer Tools.
3. Select Network.
4. Search or filter the job list.
5. Find a request containing `/wday/cxs/` and ending in `/jobs`.
6. Copy the complete request URL.
7. Add a Workday source in Career Pulse.
8. Paste the URL into Endpoint CXS.
9. Save the settings.

A typical endpoint resembles:

```text
https://company.wd3.myworkdayjobs.com/wday/cxs/company/site/jobs
```

If the source later fails, inspect the network request again because the tenant or site name may have changed.

## Add a custom HTML or Taleo source

Use Custom HTML or Taleo when the site does not expose a supported JSON endpoint.

Three CSS selectors are required:

* Item selector identifies one complete job card or row.
* Title selector finds the job title inside each item.
* Link selector finds the application link inside each item.

Department selector and ID selector are optional.

For this HTML:

```html
<article class="job-card" data-job-id="123">
  <h2 class="job-title">Field Engineer</h2>
  <span class="department">Operations</span>
  <a class="job-link" href="/jobs/123">Apply</a>
</article>
```

Use:

```text
Item selector: .job-card
Title selector: .job-title
Link selector: a.job-link
Department selector: .department
ID selector: [data-job-id]
```

When no ID is available, Career Pulse creates a stable hash from the title and application URL.

HTML scraping is more fragile than a public API. A company may redesign its page, require JavaScript rendering, add bot protection, or change its Terms of Service. If selectors return no jobs for two consecutive checks, Career Pulse sends a Telegram warning.

## Use the company directory

Settings includes 80 official career links across energy, FMCG, manufacturing, mining, and technology. Search by company or filter by sector. The primary link opens the current job-list page; a separate link keeps the employer's general career page available when the two differ.

Each card provides two actions:

* Lihat lowongan aktif opens the direct job-list page.
* Tentang karier opens the employer's general career page when it is different.
* Configure monitor creates a Custom HTML source using the job-list URL.

Configure monitor does not guess selectors. Inspect the current job-list HTML and enter the correct selectors before saving. This is deliberate because these companies use different ATS platforms and page structures.

Disnakerja is included as an additional Indonesian vacancy resource. It is an aggregator, not an employer portal. Always verify a vacancy against the employer's official website before applying.

## Included energy companies

* [SLB](https://careers.slb.com/job-listing#sortCriteria=%40title%20ascending&f-title-job=Early%20Careers-Engineering%20and%20Manufacturing,Early%20Careers-Technology%20Development&cq=%40source%3D%3D%24%22ATS_Jobs_Source%20-%20Prod%22)
* [Halliburton](https://careers.halliburton.com/)
* [Shell](https://www.shell.com/careers.html)
* [bp](https://www.bp.com/en/global/corporate/careers.html)
* [ExxonMobil](https://jobs.exxonmobil.com/)
* [Chevron](https://careers.chevron.com/)
* [Baker Hughes](https://careers.bakerhughes.com/global/en)
* [Weatherford](https://careers.weatherford.com/)
* [TechnipFMC](https://careers.technipfmc.com/)
* [Saipem](https://www.saipem.com/en/people/careers)
* [PETRONAS](https://careers.petronas.com/)
* [Pertamina](https://recruitment.pertamina.com/)
* [MedcoEnergi](https://www.medcoenergi.com/en/career/)
* [ConocoPhillips](https://careers.conocophillips.com/)
* [TotalEnergies](https://careers.totalenergies.com/)
* [Eni](https://www.eni.com/en-IT/careers.html)
* [Wood](https://www.woodplc.com/careers)
* [Worley](https://www.worley.com/en/careers)

## Included mining companies

* [Freeport-McMoRan](https://jobs.fcx.com/)
* [Vale](https://vale.com/ca/career-opportunities)
* [Newmont](https://jobs.newmont.com/)
* [Rio Tinto](https://www.riotinto.com/en/careers)
* [BHP](https://www.bhp.com/careers)
* [Anglo American](https://www.angloamerican.com/careers/job-opportunities)
* [Barrick](https://jobs.barrick.com/)
* [Glencore](https://www.glencore.com/en/careers)
* [Thiess](https://thiess.com/en/people-and-careers)
* [Orica](https://careers.orica.com/)
* [ANTAM](https://www.antam.com/en/career)
* [Adaro](https://adarocareer.com/index.php/home/job_list/)
* [Bukit Asam](https://www.ptba.co.id/karir)
* [Harita Nickel](https://careers.haritanickel.com/)
* [AMMAN Mineral](https://careers.amman.co.id/)
* [Kaltim Prima Coal](https://www.kpc.co.id/career/)
* [Petrosea](https://career.petrosea.com/?locale=en_GB)

## Included technology companies

* [Microsoft](https://careers.microsoft.com/)
* [Google](https://www.google.com/about/careers/applications/)
* [Amazon](https://www.amazon.jobs/)
* [IBM](https://www.ibm.com/careers)
* [Oracle](https://careers.oracle.com/)
* [SAP](https://jobs.sap.com/)
* [NVIDIA](https://www.nvidia.com/en-us/about-nvidia/careers/)
* [Grab](https://www.grab.careers/)
* [GoTo](https://www.gotocompany.com/careers)
* [Traveloka](https://careers.traveloka.com/)
* [Sea](https://career.sea.com/)
* [ByteDance](https://joinbytedance.com/)
* [Telkom Indonesia](https://careers.telkom.co.id/)
* [Indosat Ooredoo Hutchison](https://careers.ioh.co.id/)
* [Xendit](https://www.xendit.co/en/careers/)

## Included FMCG companies

* [Unilever Indonesia](https://careers.unilever.com/en/indonesia)
* [Garudafood](https://career.garudafood.co.id/Page/Home.aspx)
* [Nestlé Indonesia](https://www.nestle.co.id/jobs)
* [Indofood](https://career.indofood.com/vacancy.aspx)
* [Mayora](https://karir.mayora.co.id/cdb/job/search)
* [Wings Group](https://www.wingscareer.com/content/Vacancies/?locale=en_GB)
* [Danone Indonesia](https://careers.danone.com/id/id/home.html)
* [Coca-Cola Europacific Partners Indonesia](https://www.cocacolaep.com/en-id/careers/)
* [Procter & Gamble Indonesia](https://www.pgcareers.com/global/en/locations/indonesia)
* [Mondelēz Indonesia](https://www.mondelezinternational.com/indonesia/)
* [Kalbe Consumer Health](https://www.kalbeconsumerhealth.com/id/id/karir)
* [OT Group](https://ot.id/career)

## Included manufacturing companies

* [Astra International](https://career.astra.co.id/)
* [Toyota Astra Motor](https://recruitment.toyota.astra.co.id/)
* [Honda Prospect Motor](https://www.honda-indonesia.com/careers)
* [Astra Honda Motor](https://recruitment.astra-honda.com/)
* [Astra Daihatsu Motor](https://recruitment.daihatsu.astra.co.id/job)
* [Yamaha Motor Indonesia](https://www.yamaha-motor.co.id/corporate/career/)
* [Suzuki Indonesia](https://www.suzuki.co.id/corporate/karir?page=0)
* [Panasonic Gobel Indonesia](https://www.panasonic.com/id/corporate/careers.html)
* [Schneider Electric Indonesia](https://www.se.com/id/en/about-us/careers/overview/)
* [Siemens](https://www.siemens.com/global/en/company/jobs.html)
* [Samsung Indonesia](https://www.samsung.com/id/about-us/careers/)

## Additional Indonesian energy companies

* [PLN](https://rekrutmen.pln.co.id/vacancy/site)
* [Pupuk Indonesia](https://karir.pupuk-indonesia.com/)
* [Chandra Asri Group](https://careers.chandra-asri.com/)
* [Star Energy Geothermal](https://www.starenergygeothermal.co.id/current-vacancies/)
* [Tripatra](https://www.tripatra.com/en/careers)
* [AKR Corporindo](https://careers.akr.co.id/life-at-akr)
* [Pertamina Geothermal Energy](https://www.pge.pertamina.com/id/perekrutan-pengembangan-dan-retensi-karyawan)

## Additional Indonesian resource

* [Disnakerja](https://disnakerja.com/)

## Run a manual check

1. Click the Career Pulse icon.
2. Confirm that at least one source is active.
3. Click Check now.
4. Wait for the summary.

The popup shows active sources and the five latest alerts. The rolling history retains up to 50 alerts locally.

For detailed output, open `chrome://extensions`, find Career Pulse, and click the service worker link. Successful results use the `Career Pulse jobs` console label.

## Simulate a new job

1. Run a successful check to create a baseline.
2. Open Developer Tools for an extension page.
3. Open Application, Extension storage, and Local.
4. Find `snapshots`.
5. Remove one job ID from the source being tested.
6. Save the storage value.
7. Click Check now again.

The removed ID should be detected as new and sent to Telegram.

## Permissions

The manifest includes fixed access for Greenhouse, Lever, Telegram, common Workday hosts, and Taleo. Custom websites request their host permission when settings are saved.

If a host permission is denied, the source cannot be fetched. Open the browser extension details page to review or restore site access.

## Privacy and security

Career Pulse stores these values locally:

* Telegram bot token
* Telegram chat ID
* Source configuration
* Job ID snapshots
* Source status and errors
* Rolling alert history

The extension has no analytics, advertising, user tracking, or remote application server.

Telegram messages pass through Telegram's infrastructure. Career requests go directly from your browser and use your own network connection and IP address.

Do not monitor private pages requiring an employer, employee, or applicant login. Never place browser cookies, passwords, or private API keys in source fields.

## Responsible use

Public visibility does not automatically mean automated access is permitted. Review each site's Terms of Service before enabling HTML scraping.

Prefer public ATS endpoints such as Greenhouse and Lever. Use slower intervals for custom pages. Career Pulse is intended for personal job searching, not commercial redistribution.

Always apply through an official company domain. Be cautious when a vacancy asks for money, travel payment, financial information, or contact through an unrelated personal account.

## Run automated tests

From the `extension` folder, run:

```powershell
node tests/run-tests.mjs
```

Tests use mock responses and do not need a real Telegram token or internet connection. They cover scraper normalization, Workday pagination, baseline creation, new-job detection, Telegram delivery, snapshots, alarms, selector warnings, and the 80-company directory.

## Troubleshooting

### The Telegram test does not arrive

Confirm that you started the bot chat, copied the complete token, and used the correct chat ID. Send a fresh message and call `getUpdates` again.

### A source always returns an error

Open the service worker console and inspect the HTTP status. A 403 or 429 normally means access control or rate limiting. Let the backoff work instead of repeatedly clicking Check now.

### A custom source finds no jobs

Recheck the item, title, and link selectors. The page may render jobs through JavaScript while the fetched HTML contains none. Look for a public JSON request in Network and use a supported ATS type when possible.

### Workday stopped working

Inspect the career portal Network tab and locate the current CXS request. The tenant or career site name may have changed.

### Alerts are duplicated

The site may change IDs or URLs on every request. A stable ID selector is better than a title-based fallback.

### Automatic checks do not run

Keep Chrome or Edge running. Confirm the source is enabled and the browser has not suspended the extension through battery or enterprise policies.

## Project structure

```text
background/
  scrapers/
  diff-engine.js
  html-parser.js
  service-worker.js
  storage.js
  telegram-client.js
lib/
  company-directory.js
  selectors.json
offscreen/
options/
popup/
tests/
manifest.json
```

The project uses plain JavaScript, HTML, and CSS. Edit a file, return to the extensions page, and click Reload to test the change.
