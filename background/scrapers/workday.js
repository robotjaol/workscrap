import { validateHttpsUrl } from "../../lib/config-validator.js";

function createEndpoint(source) {
  if (source.endpoint?.trim()) {
    return validateHttpsUrl(source.endpoint, "Workday endpoint").href;
  }
  if (!source.host || !source.tenant || !source.site) {
    throw new Error("Workday endpoint is incomplete");
  }
  const host = source.host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return validateHttpsUrl(
    `https://${host}/wday/cxs/${source.tenant}/${source.site}/jobs`,
    "Workday endpoint"
  ).href;
}

function jobUrl(endpoint, path) {
  return new URL(path, endpoint).href;
}

export async function scrapeWorkday(source) {
  const endpoint = createEndpoint(source);
  const jobs = [];
  let offset = 0;
  let total = 1;

  while (offset < total && offset < 500) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: 20,
        offset,
        searchText: ""
      })
    });
    if (!response.ok) {
      throw new Error(`Workday HTTP ${response.status}`);
    }
    const data = await response.json();
    const page = data.jobPostings ?? [];
    for (const job of page) {
      const path = job.externalPath || job.url || "";
      jobs.push({
        id: String(path || job.bulletFields?.[0] || job.title),
        title: job.title,
        department: job.jobFamily || job.location || "",
        url: jobUrl(endpoint, path),
        publishedAt: job.postedOn || null
      });
    }
    total = Number(data.total) || page.length;
    if (page.length === 0) {
      break;
    }
    offset += page.length;
  }
  return jobs;
}
