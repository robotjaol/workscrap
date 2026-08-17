import { COMPANY_DIRECTORY, JOB_RESOURCES } from "../lib/company-directory.js";

const entries = [
  ...COMPANY_DIRECTORY.map((company) => ({
    name: company.name,
    url: company.jobListUrl
  })),
  ...JOB_RESOURCES.map((resource) => ({
    name: resource.name,
    url: resource.url
  }))
];

function jobLinkScore(anchor, sourceUrl) {
  const value = `${anchor.label} ${anchor.url}`.toLowerCase();
  let score = 0;
  if (/search jobs|search vacancies|job search|view jobs|find jobs|see all jobs|all jobs|current job|current vacanc|job opportunit|lowongan pekerjaan|job vacancies|find vacancy|explore all jobs/.test(value)) score += 12;
  if (/\/search(?:-jobs)?\b|\/jobs(?:[/?#]|$)|\/vacanc(?:y|ies)(?:[/?#]|$)|\/job[-_]?list|\/requisitions\b/.test(anchor.url.toLowerCase())) score += 8;
  if (/job|vacan|lowongan|karir|rekrut|opportunit/.test(value)) score += 3;
  if (anchor.url === sourceUrl || /#(?:content|main|$)/.test(anchor.url)) score -= 6;
  if (/linkedin|instagram|facebook|twitter|privacy|fraud|alert|profile|login|register/.test(value)) score -= 8;
  return score;
}

async function inspect(entry) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(entry.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Career-Pulse-Link-Audit"
      },
      redirect: "follow",
      signal: controller.signal
    });
    const contentType = response.headers.get("content-type") || "";
    const html = contentType.includes("text/html")
      ? await response.text()
      : "";
    const text = html.toLowerCase();
    const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => {
        const label = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        try {
          return {
            label,
            url: new URL(match[1].replaceAll("&amp;", "&"), response.url).href
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const jobLinks = anchors.filter((anchor) =>
      /job|career|vacan|lowongan|karir|rekrut|opportunit/i.test(`${anchor.label} ${anchor.url}`)
    ).map((anchor) => ({
      ...anchor,
      score: jobLinkScore(anchor, response.url)
    })).sort((left, right) => right.score - left.score);
    const jobDetailLinks = jobLinks.filter((anchor) =>
      /jobdescription|job-detail|job\/\d|jobs\/\d|requisition|vacanc(?:y|ies)\//i.test(anchor.url)
    );
    return {
      ...entry,
      status: response.status,
      finalUrl: response.url,
      contentType,
      hasCareerText: /career|vacan|job|lowongan|karir|rekrut/.test(text),
      hasJobListings: jobDetailLinks.length > 0,
      jobLinkCount: jobLinks.length,
      jobCandidates: jobLinks.slice(0, 3),
      bytes: html.length
    };
  } catch (error) {
    return {
      ...entry,
      status: 0,
      finalUrl: entry.url,
      contentType: "",
      hasCareerText: false,
      bytes: 0,
      error: error.name === "AbortError" ? "Timeout" : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
const queue = [...entries];

async function worker() {
  while (queue.length > 0) {
    const entry = queue.shift();
    results.push(await inspect(entry));
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
results.sort((left, right) => left.name.localeCompare(right.name));

for (const result of results) {
  console.log(JSON.stringify(result));
}

const reachable = results.filter((result) => result.status >= 200 && result.status < 400);
const blocked = results.filter((result) => [401, 403, 429].includes(result.status));
const inconclusive = results.filter((result) => result.status === 0);
const broken = results.filter((result) =>
  result.status >= 400 && !blocked.includes(result)
);

console.log(JSON.stringify({
  total: results.length,
  reachable: reachable.length,
  blocked: blocked.length,
  inconclusive: inconclusive.length,
  broken: broken.length,
  withJobListings: results.filter((result) => result.hasJobListings).length
}));

if (broken.length > 0) {
  process.exitCode = 1;
}
