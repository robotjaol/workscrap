import {
  getActivity,
  getAlerts,
  getConfig
} from "../background/storage.js";

const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector("#statusDot");
const activeCount = document.querySelector("#activeCount");
const alertCount = document.querySelector("#alertCount");
const alertList = document.querySelector("#alertList");
const emptyAlerts = document.querySelector("#emptyAlerts");
const checkResult = document.querySelector("#checkResult");
const manualCheck = document.querySelector("#manualCheck");

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(timestamp);
}

function renderAlerts(alerts) {
  alertList.replaceChildren();
  const recentAlerts = alerts.slice(0, 5);
  emptyAlerts.hidden = recentAlerts.length > 0;
  for (const alert of recentAlerts) {
    const item = document.createElement("li");
    item.className = "alert-item";
    const link = document.createElement("a");
    link.href = alert.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    const title = document.createElement("strong");
    title.textContent = alert.title;
    const meta = document.createElement("span");
    meta.textContent = `${alert.company} · ${formatTime(alert.sentAt)}`;
    link.append(title, meta);
    item.append(link);
    alertList.append(item);
  }
}

async function refreshPopup() {
  const [config, alerts, activity] = await Promise.all([
    getConfig(),
    getAlerts(),
    getActivity()
  ]);
  const enabledSources = config.sources.filter((source) => source.enabled);
  activeCount.textContent = enabledSources.length;
  alertCount.textContent = alerts.length;
  statusText.textContent = activity.message || (
    activity.active ? "Monitoring is active" : "Monitoring is not active"
  );
  statusDot.classList.toggle("active", activity.active);
  renderAlerts(alerts);
}

manualCheck.addEventListener("click", async () => {
  manualCheck.disabled = true;
  checkResult.classList.remove("error");
  checkResult.textContent = "Checking all sources...";
  try {
    const response = await chrome.runtime.sendMessage({ type: "manual-check" });
    if (!response.ok) {
      throw new Error(response.error);
    }
    const successes = response.results.filter((result) => result.ok).length;
    const newJobs = response.results.reduce(
      (total, result) => total + (result.newCount || 0),
      0
    );
    const sourceLabel = successes === 1 ? "source" : "sources";
    const jobLabel = newJobs === 1 ? "new job" : "new jobs";
    checkResult.textContent = `${successes} ${sourceLabel} completed, ${newJobs} ${jobLabel}.`;
    await refreshPopup();
  } catch (error) {
    checkResult.textContent = error.message;
    checkResult.classList.add("error");
  } finally {
    manualCheck.disabled = false;
  }
});

document.querySelector("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

refreshPopup().catch((error) => {
  statusText.textContent = error.message;
});
