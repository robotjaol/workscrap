import assert from "node:assert/strict";
import {
  createBaseline,
  findNewJobs,
  mergeSnapshot
} from "../background/diff-engine.js";
import { scrapeGreenhouse } from "../background/scrapers/greenhouse.js";
import { scrapeLever } from "../background/scrapers/lever.js";
import { scrapeWorkday } from "../background/scrapers/workday.js";
import { COMPANY_DIRECTORY, JOB_RESOURCES } from "../lib/company-directory.js";
import {
  permissionOrigins,
  validateConfig
} from "../lib/config-validator.js";

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  };
}

async function testDiffEngine() {
  const jobs = [
    { id: "a", title: "Engineer" },
    { id: "b", title: "Designer" }
  ];
  assert.deepEqual(createBaseline(jobs), ["a", "b"]);
  assert.deepEqual(findNewJobs(jobs, ["a"]), [jobs[1]]);
  assert.deepEqual(findNewJobs([jobs[1], jobs[1]], ["a"]), [jobs[1]]);
  assert.deepEqual(mergeSnapshot(["b", "c"], ["a", "b"]), ["b", "c", "a"]);
}

async function testCompanyDirectory() {
  assert.equal(COMPANY_DIRECTORY.length, 80);
  assert.equal(new Set(COMPANY_DIRECTORY.map((company) => company.name)).size, 80);
  assert.equal(new Set(COMPANY_DIRECTORY.map((company) => company.careerUrl)).size, 80);
  assert.ok(COMPANY_DIRECTORY.every((company) => company.careerUrl.startsWith("https://")));
  assert.ok(COMPANY_DIRECTORY.every((company) => company.jobListUrl.startsWith("https://")));
  assert.ok(COMPANY_DIRECTORY.filter((company) => company.jobListUrl !== company.careerUrl).length >= 55);
  assert.match(
    COMPANY_DIRECTORY.find((company) => company.name === "SLB").jobListUrl,
    /careers\.slb\.com\/job-listing#/
  );
  assert.ok(COMPANY_DIRECTORY.some((company) => company.name === "Microsoft"));
  assert.equal(COMPANY_DIRECTORY.filter((company) => company.sector === "FMCG").length, 12);
  assert.equal(COMPANY_DIRECTORY.filter((company) => company.sector === "Manufacturing").length, 11);
  assert.equal(JOB_RESOURCES[0].name, "Disnakerja");
}

async function testConfigValidation() {
  const source = {
    id: "source-1",
    type: "custom",
    name: "Acme",
    url: "https://acme.test/careers",
    itemSelector: ".job",
    titleSelector: ".title",
    linkSelector: "a",
    intervalMin: 15,
    enabled: true
  };
  const config = { telegram: { token: "", chatId: "" }, sources: [source] };
  assert.equal(validateConfig(config), config);
  assert.deepEqual(permissionOrigins(config.sources), ["https://acme.test/*"]);
  assert.throws(
    () => validateConfig({ ...config, sources: [{ ...source, url: "http://acme.test" }] }),
    /must use HTTPS/
  );
  assert.throws(
    () => validateConfig({
      ...config,
      sources: [{ ...source, url: "https://user:pass@acme.test/careers" }]
    }),
    /must not include credentials/
  );
  assert.throws(
    () => validateConfig({ ...config, sources: [source, { ...source }] }),
    /must be unique/
  );
  assert.throws(
    () => validateConfig({
      ...config,
      telegram: { token: "secret", chatId: "" }
    }),
    /must be configured together/
  );
}

async function testGreenhouse() {
  global.fetch = async (url) => {
    assert.match(url, /boards\/acme\/jobs$/);
    return jsonResponse({
      jobs: [{
        id: 10,
        title: "Backend Engineer",
        absolute_url: "https://acme.test/jobs/10",
        updated_at: "2026-08-17",
        departments: [{ name: "Engineering" }]
      }]
    });
  };
  const jobs = await scrapeGreenhouse({ boardToken: "acme" });
  assert.equal(jobs[0].id, "10");
  assert.equal(jobs[0].department, "Engineering");
}

async function testLever() {
  global.fetch = async (url) => {
    assert.match(url, /postings\/acme\?mode=json$/);
    return jsonResponse([{
      id: "lever-1",
      text: "Product Designer",
      hostedUrl: "https://jobs.test/lever-1",
      createdAt: 123,
      categories: { team: "Product" }
    }]);
  };
  const jobs = await scrapeLever({ company: "acme" });
  assert.equal(jobs[0].title, "Product Designer");
  assert.equal(jobs[0].department, "Product");
}

async function testWorkday() {
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    assert.equal(url, "https://acme.test/wday/cxs/acme/jobs/jobs");
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.equal(body.offset, calls === 1 ? 0 : 1);
    if (calls === 1) {
      return jsonResponse({
        total: 2,
        jobPostings: [{
          title: "Analyst",
          externalPath: "/job/analyst",
          location: "Jakarta"
        }]
      });
    }
    return jsonResponse({
      total: 2,
      jobPostings: [{
        title: "Manager",
        externalPath: "/job/manager",
        location: "Remote"
      }]
    });
  };
  const jobs = await scrapeWorkday({
    endpoint: "https://acme.test/wday/cxs/acme/jobs/jobs"
  });
  assert.equal(jobs.length, 2);
  assert.equal(jobs[1].url, "https://acme.test/job/manager");
  await assert.rejects(
    () => scrapeWorkday({ endpoint: "http://acme.test/jobs" }),
    /must use HTTPS/
  );
}

async function testServiceWorker() {
  const storageData = {
    config: {
      telegram: {
        token: "test-token",
        chatId: "test-chat"
      },
      sources: [{
        id: "source-1",
        type: "greenhouse",
        name: "Acme",
        boardToken: "acme",
        intervalMin: 5,
        enabled: true
      }]
    }
  };
  const alarms = new Map();
  const listeners = {};
  let apiPhase = 1;
  let telegramCalls = 0;

  global.chrome = {
    storage: {
      local: {
        get: async (key) => ({ [key]: storageData[key] }),
        set: async (patch) => Object.assign(storageData, patch)
      }
    },
    alarms: {
      create: async (name, info) => alarms.set(name, { name, ...info }),
      clear: async (name) => alarms.delete(name),
      getAll: async () => [...alarms.values()],
      onAlarm: {
        addListener: (listener) => {
          listeners.alarm = listener;
        }
      }
    },
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`,
      getContexts: async () => [],
      sendMessage: async (message) => {
        if (message.target === "offscreen-parser") {
          return { ok: true, jobs: [] };
        }
        throw new Error("Unexpected runtime message");
      },
      onInstalled: {
        addListener: (listener) => {
          listeners.installed = listener;
        }
      },
      onStartup: {
        addListener: (listener) => {
          listeners.startup = listener;
        }
      },
      onMessage: {
        addListener: (listener) => {
          listeners.message = listener;
        }
      }
    },
    offscreen: {
      hasDocument: async () => true
    }
  };

  global.fetch = async (url) => {
    if (url.startsWith("https://boards-api.greenhouse.io")) {
      const jobs = [{
        id: 1,
        title: "Existing Role",
        absolute_url: "https://acme.test/jobs/1",
        departments: []
      }];
      if (apiPhase === 2) {
        jobs.unshift({
          id: 2,
          title: "New Role",
          absolute_url: "https://acme.test/jobs/2",
          departments: [{ name: "Engineering" }]
        });
      }
      return jsonResponse({ jobs });
    }
    if (url.startsWith("https://api.telegram.org")) {
      telegramCalls += 1;
      return jsonResponse({ ok: true, result: { message_id: telegramCalls } });
    }
    if (url === "https://acme.test/careers") {
      return {
        ok: true,
        status: 200,
        text: async () => "<html><body></body></html>"
      };
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  await import(`../background/service-worker.js?test=${Date.now()}`);
  await new Promise((resolve) => setTimeout(resolve, 20));

  const sendMessage = (message) => new Promise((resolve) => {
    const asynchronous = listeners.message(message, {}, resolve);
    assert.equal(asynchronous, true);
  });

  const baseline = await sendMessage({ type: "manual-check" });
  assert.equal(baseline.results[0].baseline, true);
  assert.deepEqual(storageData.snapshots["source-1"], ["1"]);

  apiPhase = 2;
  const update = await sendMessage({ type: "manual-check" });
  assert.equal(update.results[0].newCount, 1);
  assert.equal(update.results[0].sentCount, 1);
  assert.equal(telegramCalls, 1);
  assert.deepEqual(storageData.snapshots["source-1"], ["2", "1"]);
  assert.equal(storageData.alerts[0].title, "New Role");
  assert.ok(alarms.has("career-source:source-1"));

  storageData.config.sources.push({
    id: "source-2",
    type: "custom",
    name: "Acme Custom",
    url: "https://acme.test/careers",
    itemSelector: ".job",
    titleSelector: ".title",
    linkSelector: "a",
    intervalMin: 15,
    enabled: true
  });
  await sendMessage({ type: "manual-check", sourceId: "source-2" });
  await sendMessage({ type: "manual-check", sourceId: "source-2" });
  assert.equal(storageData.sourceState["source-2"].emptyCycles, 2);
  assert.equal(storageData.sourceState["source-2"].selectorWarned, true);
  assert.equal(telegramCalls, 2);
}

await testDiffEngine();
await testCompanyDirectory();
await testConfigValidation();
await testGreenhouse();
await testLever();
await testWorkday();
await testServiceWorker();
console.log("All tests passed");
