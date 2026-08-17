function textFrom(root, selector) {
  if (!selector) {
    return "";
  }
  return root.querySelector(selector)?.textContent?.trim() || "";
}

function attributeFrom(root, selector, name) {
  if (!selector) {
    return "";
  }
  return root.querySelector(selector)?.getAttribute(name)?.trim() || "";
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseJobs(message) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(message.html, "text/html");
  const selectors = message.selectors;
  const items = [...documentNode.querySelectorAll(selectors.item)];
  return items.map((item) => {
    const linkNode = item.querySelector(selectors.link);
    const href = linkNode?.getAttribute("href")?.trim() || "";
    const url = href ? new URL(href, message.baseUrl).href : message.baseUrl;
    const title = textFrom(item, selectors.title);
    const explicitId = attributeFrom(item, selectors.id, "data-job-id") ||
      textFrom(item, selectors.id);
    return {
      id: explicitId || stableHash(`${title}|${url}`),
      title,
      department: textFrom(item, selectors.department),
      url,
      publishedAt: null
    };
  }).filter((job) => job.title && job.url);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen-parser" || message.type !== "parse-jobs") {
    return false;
  }
  try {
    sendResponse({ ok: true, jobs: parseJobs(message) });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  }
  return true;
});
