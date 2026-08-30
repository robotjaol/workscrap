import {
  addAlert,
  getConfig,
  getSnapshots,
  getSourceStates,
  removeSnapshot,
  removeSourceState,
  saveSnapshot,
  setActivity,
  updateSourceState
} from "./storage.js";
import {
  createBaseline,
  findNewJobs,
  mergeSnapshot
} from "./diff-engine.js";
import {
  formatJobAlert,
  formatSourceWarning,
  isTelegramReady,
  sendTelegram,
  testTelegram
} from "./telegram-client.js";
import { scrapeGreenhouse } from "./scrapers/greenhouse.js";
import { scrapeLever } from "./scrapers/lever.js";
import { scrapeWorkday } from "./scrapers/workday.js";
import { scrapeTaleo } from "./scrapers/taleo.js";
import { scrapeGenericHtml } from "./scrapers/generic-html.js";

const ALARM_PREFIX = "career-source:";
const runningSources = new Set();

const scrapers = {
  greenhouse: scrapeGreenhouse,
  lever: scrapeLever,
  workday: scrapeWorkday,
  taleo: scrapeTaleo,
  custom: scrapeGenericHtml
};

function randomDelay(source) {
  const minimum = Math.max(5, Number(source.intervalMin) || 15);
  const maximum = source.type === "custom" || source.type === "taleo"
    ? Math.max(15, minimum + 5)
    : minimum + 5;
  return minimum + Math.random() * (maximum - minimum);
}

async function scheduleSource(source, delayMinutes) {
  const delay = Math.max(1, delayMinutes);
  const nextRun = Date.now() + delay * 60_000;
  await chrome.alarms.create(`${ALARM_PREFIX}${source.id}`, {
    when: nextRun
  });
  await updateSourceState(source.id, { nextRun });
}

async function scheduleNext(source, failures = 0) {
  const base = randomDelay(source);
  const delay = Math.min(120, base * (2 ** failures));
  await scheduleSource(source, delay);
}

async function syncSchedules(runSoon = false) {
  const config = await getConfig();
  const activeIds = new Set(
    config.sources.filter((source) => source.enabled).map((source) => source.id)
  );
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (!alarm.name.startsWith(ALARM_PREFIX)) {
      continue;
    }
    const sourceId = alarm.name.slice(ALARM_PREFIX.length);
    if (!activeIds.has(sourceId) || runSoon) {
      await chrome.alarms.clear(alarm.name);
    }
  }
  const currentAlarms = await chrome.alarms.getAll();
  const scheduled = new Set(currentAlarms.map((alarm) => alarm.name));
  for (const source of config.sources) {
    if (!source.enabled) {
      continue;
    }
    const alarmName = `${ALARM_PREFIX}${source.id}`;
    if (!scheduled.has(alarmName)) {
      await scheduleSource(source, runSoon ? Math.random() + 0.1 : randomDelay(source));
    }
  }
  await setActivity({
    active: activeIds.size > 0,
    lastCheck: Date.now(),
    message: activeIds.size > 0 ? "Monitoring is active" : "No active sources"
  });
}

async function handleSelectorFailure(source, config, previousState) {
  const emptyCycles = (previousState.emptyCycles || 0) + 1;
  const patch = {
    emptyCycles,
    failures: 0,
    lastCheck: Date.now(),
    lastError: "The configured selectors found no jobs"
  };
  if (emptyCycles >= 2 && !previousState.selectorWarned) {
    if (isTelegramReady(config.telegram)) {
      try {
        await sendTelegram(config.telegram, formatSourceWarning(source));
        patch.selectorWarned = true;
      } catch (error) {
        patch.warningError = error.message;
      }
    }
  }
  await updateSourceState(source.id, patch);
  await scheduleNext(source, 0);
}

async function deliverJobs(source, jobs, config, previousIds) {
  const deliveredIds = [];
  try {
    for (const job of jobs) {
      if (!isTelegramReady(config.telegram)) {
        break;
      }
      await sendTelegram(config.telegram, formatJobAlert(source, job));
      deliveredIds.push(String(job.id));
      await addAlert({
        sourceId: source.id,
        company: source.name,
        title: job.title,
        url: job.url,
        sentAt: Date.now()
      });
    }
  } finally {
    if (deliveredIds.length > 0) {
      await saveSnapshot(source.id, mergeSnapshot(deliveredIds, previousIds));
    }
  }
  return deliveredIds.length;
}

async function pollSource(source, manual = false) {
  if (runningSources.has(source.id)) {
    return { ok: false, error: "A check is already running" };
  }
  runningSources.add(source.id);
  const checkedAt = Date.now();
  try {
    const config = await getConfig();
    const scraper = scrapers[source.type];
    if (!scraper) {
      throw new Error(`Unsupported source type: ${source.type}`);
    }
    const jobs = await scraper(source);
    console.info("Career Pulse check", {
      sourceId: source.id,
      sourceName: source.name,
      jobCount: jobs.length
    });
    const snapshots = await getSnapshots();
    const previousIds = snapshots[source.id];
    if (!previousIds) {
      await saveSnapshot(source.id, createBaseline(jobs));
      await updateSourceState(source.id, {
        failures: 0,
        emptyCycles: 0,
        selectorWarned: false,
        lastCheck: checkedAt,
        lastSuccess: checkedAt,
        lastError: "",
        jobCount: jobs.length
      });
      return { ok: true, baseline: true, jobCount: jobs.length, newCount: 0 };
    }
    const newJobs = findNewJobs(jobs, previousIds);
    const sentCount = await deliverJobs(source, newJobs, config, previousIds);
    await updateSourceState(source.id, {
      failures: 0,
      emptyCycles: 0,
      selectorWarned: false,
      lastCheck: checkedAt,
      lastSuccess: checkedAt,
      lastError: "",
      jobCount: jobs.length
    });
    return {
      ok: true,
      baseline: false,
      jobCount: jobs.length,
      newCount: newJobs.length,
      sentCount
    };
  } catch (error) {
    const states = await getSourceStates();
    const previousState = states[source.id] ?? {};
    if (error.code === "SELECTOR_EMPTY") {
      const config = await getConfig();
      await handleSelectorFailure(source, config, previousState);
      return { ok: false, error: error.message };
    }
    const failures = (previousState.failures || 0) + 1;
    await updateSourceState(source.id, {
      failures,
      lastCheck: checkedAt,
      lastError: error.message
    });
    if (!manual) {
      await scheduleNext(source, failures);
    }
    console.error("Career Pulse error", source.name, error);
    return { ok: false, error: error.message };
  } finally {
    runningSources.delete(source.id);
    await setActivity({
      active: true,
      lastCheck: checkedAt,
      message: `Last checked ${source.name}`
    });
  }
}

async function runScheduled(sourceId) {
  const config = await getConfig();
  const source = config.sources.find((item) => item.id === sourceId && item.enabled);
  if (!source) {
    return;
  }
  const result = await pollSource(source, false);
  if (result.ok) {
    await scheduleNext(source, 0);
  }
}

async function runManual(sourceId) {
  const config = await getConfig();
  const sources = sourceId
    ? config.sources.filter((source) => source.id === sourceId)
    : config.sources.filter((source) => source.enabled);
  const results = [];
  for (const source of sources) {
    results.push({
      sourceId: source.id,
      sourceName: source.name,
      ...(await pollSource(source, true))
    });
  }
  return results;
}

async function cleanRemovedSources() {
  const config = await getConfig();
  const ids = new Set(config.sources.map((source) => source.id));
  const snapshots = await getSnapshots();
  const states = await getSourceStates();
  for (const id of new Set([...Object.keys(snapshots), ...Object.keys(states)])) {
    if (!ids.has(id)) {
      await removeSnapshot(id);
      await removeSourceState(id);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncSchedules(true).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  syncSchedules(false).catch(console.error);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) {
    return;
  }
  runScheduled(alarm.name.slice(ALARM_PREFIX.length)).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen-parser") {
    return false;
  }
  const handlers = {
    "sync-config": async () => {
      await cleanRemovedSources();
      await syncSchedules(true);
      return { ok: true };
    },
    "manual-check": async () => ({
      ok: true,
      results: await runManual(message.sourceId)
    }),
    "test-telegram": async () => {
      await testTelegram(message.telegram);
      return { ok: true };
    }
  };
  const handler = handlers[message.type];
  if (!handler) {
    return false;
  }
  handler()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

syncSchedules(false).catch(console.error);
