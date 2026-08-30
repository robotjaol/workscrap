export const SOURCE_TYPES = Object.freeze([
  "greenhouse",
  "lever",
  "workday",
  "taleo",
  "custom"
]);

const HTML_SOURCE_TYPES = new Set(["custom", "taleo"]);

function requireValue(value, label) {
  if (!value?.trim()) {
    throw new Error(`${label} is required`);
  }
}

export function validateHttpsUrl(value, label) {
  requireValue(value, label);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS`);
  }
  if (url.username || url.password) {
    throw new Error(`${label} must not include credentials`);
  }
  return url;
}

export function sourceUrl(source) {
  if (source.type === "workday") {
    return source.endpoint;
  }
  if (HTML_SOURCE_TYPES.has(source.type)) {
    return source.url;
  }
  return "";
}

export function validateConfig(config) {
  if (!config || !Array.isArray(config.sources)) {
    throw new Error("Configuration must include a sources array");
  }

  const hasToken = Boolean(config.telegram?.token?.trim());
  const hasChatId = Boolean(config.telegram?.chatId?.trim());
  if (hasToken !== hasChatId) {
    throw new Error("Telegram bot token and chat ID must be configured together");
  }

  const ids = new Set();
  for (const source of config.sources) {
    requireValue(source.id, "Source ID");
    if (ids.has(source.id)) {
      throw new Error(`Source IDs must be unique: ${source.id}`);
    }
    ids.add(source.id);

    requireValue(source.name, "Source name");
    if (!SOURCE_TYPES.includes(source.type)) {
      throw new Error(`Unsupported source type: ${source.type}`);
    }

    const interval = Number(source.intervalMin);
    if (!Number.isFinite(interval) || interval < 5 || interval > 120) {
      throw new Error(`${source.name} interval must be between 5 and 120 minutes`);
    }

    if (source.type === "greenhouse") {
      requireValue(source.boardToken, `${source.name} board token`);
    } else if (source.type === "lever") {
      requireValue(source.company, `${source.name} company slug`);
    } else if (source.type === "workday") {
      validateHttpsUrl(source.endpoint, `${source.name} endpoint`);
    } else if (HTML_SOURCE_TYPES.has(source.type)) {
      validateHttpsUrl(source.url, `${source.name} career page URL`);
      requireValue(source.itemSelector, `${source.name} item selector`);
      requireValue(source.titleSelector, `${source.name} title selector`);
      requireValue(source.linkSelector, `${source.name} link selector`);
    }
  }

  return config;
}

export function permissionOrigins(sources) {
  return [...new Set(sources.map(sourceUrl).filter(Boolean).map((value) => {
    const url = validateHttpsUrl(value, "Source URL");
    return `${url.origin}/*`;
  }))];
}
