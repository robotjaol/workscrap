export async function scrapeGreenhouse(source) {
  const token = source.boardToken?.trim();
  if (!token) {
    throw new Error("Board token is required");
  }
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Greenhouse HTTP ${response.status}`);
  }
  const data = await response.json();
  return (data.jobs ?? []).map((job) => ({
    id: String(job.id),
    title: job.title,
    department: job.departments?.map((item) => item.name).join(", ") || "",
    url: job.absolute_url,
    publishedAt: job.updated_at || null
  }));
}
