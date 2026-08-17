const CONFIG_KEY = "config";
const SNAPSHOTS_KEY = "snapshots";
const SOURCE_STATE_KEY = "sourceState";
const ALERTS_KEY = "alerts";
const ACTIVITY_KEY = "activity";

export const DEFAULT_CONFIG = {
  telegram: {
    token: "",
    chatId: ""
  },
  sources: []
};

async function read(key, fallback) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? fallback;
}

async function write(key, value) {
  await chrome.storage.local.set({ [key]: value });
  return value;
}

export async function getConfig() {
  return read(CONFIG_KEY, DEFAULT_CONFIG);
}

export async function saveConfig(config) {
  return write(CONFIG_KEY, config);
}

export async function getSnapshots() {
  return read(SNAPSHOTS_KEY, {});
}

export async function saveSnapshot(sourceId, ids) {
  const snapshots = await getSnapshots();
  snapshots[sourceId] = ids.slice(0, 500);
  await write(SNAPSHOTS_KEY, snapshots);
}

export async function removeSnapshot(sourceId) {
  const snapshots = await getSnapshots();
  delete snapshots[sourceId];
  await write(SNAPSHOTS_KEY, snapshots);
}

export async function getSourceStates() {
  return read(SOURCE_STATE_KEY, {});
}

export async function updateSourceState(sourceId, patch) {
  const states = await getSourceStates();
  states[sourceId] = {
    ...(states[sourceId] ?? {}),
    ...patch
  };
  await write(SOURCE_STATE_KEY, states);
  return states[sourceId];
}

export async function removeSourceState(sourceId) {
  const states = await getSourceStates();
  delete states[sourceId];
  await write(SOURCE_STATE_KEY, states);
}

export async function addAlert(alert) {
  const alerts = await read(ALERTS_KEY, []);
  alerts.unshift(alert);
  await write(ALERTS_KEY, alerts.slice(0, 50));
}

export async function getAlerts() {
  return read(ALERTS_KEY, []);
}

export async function setActivity(activity) {
  return write(ACTIVITY_KEY, activity);
}

export async function getActivity() {
  return read(ACTIVITY_KEY, {
    active: false,
    lastCheck: null,
    message: "Belum pernah diperiksa"
  });
}
