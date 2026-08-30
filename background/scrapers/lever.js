export async function scrapeLever(source) {
  const company = source.company?.trim();
  if (!company) {
    throw new Error("Company slug is required");
  }
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Lever HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.map((job) => ({
    id: String(job.id),
    title: job.text,
    department: job.categories?.department || job.categories?.team || "",
    url: job.hostedUrl,
    publishedAt: job.createdAt || null
  }));
}
