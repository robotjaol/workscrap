import { parseJobsFromHtml } from "../html-parser.js";
import { validateHttpsUrl } from "../../lib/config-validator.js";

export async function scrapeGenericHtml(source) {
  const url = validateHttpsUrl(source.url, "Source URL");
  if (!source.itemSelector || !source.titleSelector || !source.linkSelector) {
    throw new Error("Required selectors are incomplete");
  }
  const response = await fetch(url.href);
  if (!response.ok) {
    throw new Error(`Career page HTTP ${response.status}`);
  }
  const html = await response.text();
  const jobs = await parseJobsFromHtml(html, source);
  if (jobs.length === 0) {
    const error = new Error("The configured selectors found no jobs");
    error.code = "SELECTOR_EMPTY";
    throw error;
  }
  return jobs;
}
