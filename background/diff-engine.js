function jobId(job) {
  return String(job.id);
}

export function findNewJobs(jobs, seenIds) {
  const seen = new Set(seenIds.map(String));
  return jobs.filter((job) => !seen.has(jobId(job)));
}

export function mergeSnapshot(ids, previousIds) {
  const merged = [...ids.map(String), ...previousIds.map(String)];
  return [...new Set(merged)].slice(0, 500);
}

export function createBaseline(jobs) {
  return [...new Set(jobs.map(jobId))].slice(0, 500);
}
