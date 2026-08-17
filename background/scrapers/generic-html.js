import { parseJobsFromHtml } from "../html-parser.js";

export async function scrapeGenericHtml(source) {
  if (!source.url?.trim()) {
    throw new Error("URL sumber wajib diisi");
  }
  if (!source.itemSelector || !source.titleSelector || !source.linkSelector) {
    throw new Error("Selector wajib belum lengkap");
  }
  const response = await fetch(source.url.trim());
  if (!response.ok) {
    throw new Error(`Career page HTTP ${response.status}`);
  }
  const html = await response.text();
  const jobs = await parseJobsFromHtml(html, source);
  if (jobs.length === 0) {
    const error = new Error("Selector tidak menemukan lowongan");
    error.code = "SELECTOR_EMPTY";
    throw error;
  }
  return jobs;
}
