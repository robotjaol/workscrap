const OFFSCREEN_PATH = "offscreen/offscreen.html";
let creatingDocument = null;

async function hasOffscreenDocument() {
  if (chrome.offscreen.hasDocument) {
    return chrome.offscreen.hasDocument();
  }
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }
  if (!creatingDocument) {
    creatingDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["DOM_PARSER"],
      justification: "Parse career page HTML"
    }).finally(() => {
      creatingDocument = null;
    });
  }
  await creatingDocument;
}

export async function parseJobsFromHtml(html, source) {
  await ensureOffscreenDocument();
  const response = await chrome.runtime.sendMessage({
    target: "offscreen-parser",
    type: "parse-jobs",
    html,
    baseUrl: source.url,
    selectors: {
      item: source.itemSelector,
      title: source.titleSelector,
      link: source.linkSelector,
      department: source.departmentSelector,
      id: source.idSelector
    }
  });
  if (!response?.ok) {
    throw new Error(response?.error || "HTML parsing failed");
  }
  return response.jobs;
}
