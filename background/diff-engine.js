function jobId(job) {
  return String(job.id);
}

export function findNewJobs(jobs, seenIds) {
  const seen = new Set(seenIds.map(String));
  const newJobs = [];
  for (const job of jobs) {
    const id = jobId(job);
    if (!seen.has(id)) {
      newJobs.push(job);
      seen.add(id);
    }
  }
  return newJobs;
}

export function mergeSnapshot(ids, previousIds) {
  const merged = [...ids.map(String), ...previousIds.map(String)];
  return [...new Set(merged)].slice(0, 500);
}

export function createBaseline(jobs) {
  return [...new Set(jobs.map(jobId))].slice(0, 500);
}
