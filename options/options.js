import { DEFAULT_CONFIG, getConfig, saveConfig } from "../background/storage.js";
import { COMPANY_DIRECTORY, JOB_RESOURCES } from "../lib/company-directory.js";
import {
  permissionOrigins,
  validateConfig
} from "../lib/config-validator.js";

const sourceList = document.querySelector("#sourceList");
const sourceTemplate = document.querySelector("#sourceTemplate");
const emptyState = document.querySelector("#emptyState");
const sourceCount = document.querySelector("#sourceCount");
const botToken = document.querySelector("#botToken");
const chatId = document.querySelector("#chatId");
const telegramBadge = document.querySelector("#telegramBadge");
const telegramResult = document.querySelector("#telegramResult");
const saveResult = document.querySelector("#saveResult");
const companyDirectory = document.querySelector("#companyDirectory");
const directoryCount = document.querySelector("#directoryCount");
const directoryEmpty = document.querySelector("#directoryEmpty");
const companySearch = document.querySelector("#companySearch");
const sectorFilter = document.querySelector("#sectorFilter");

const typeLabels = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
  taleo: "Taleo",
  custom: "Custom HTML"
};

function fieldMarkup(type) {
  if (type === "greenhouse") {
    return `
      <div class="field-grid">
        <label class="wide-field">
          <span>Board token</span>
          <input data-field="boardToken" type="text" spellcheck="false" placeholder="example-company">
          <small class="helper">The final segment of the boards.greenhouse.io URL.</small>
        </label>
      </div>`;
  }
  if (type === "lever") {
    return `
      <div class="field-grid">
        <label class="wide-field">
          <span>Company slug</span>
          <input data-field="company" type="text" spellcheck="false" placeholder="example-company">
          <small class="helper">The final segment of the jobs.lever.co URL.</small>
        </label>
      </div>`;
  }
  if (type === "workday") {
    return `
      <div class="field-grid">
        <label class="wide-field">
          <span>Endpoint CXS</span>
          <input data-field="endpoint" type="url" placeholder="https://host/wday/cxs/tenant/site/jobs">
          <small class="helper">Copy the jobs endpoint from the browser Network panel.</small>
        </label>
      </div>`;
  }
  return `
    <div class="field-grid">
      <label class="wide-field">
        <span>Career page URL</span>
        <input data-field="url" type="url" placeholder="https://company.com/careers">
      </label>
      <label>
        <span>Item selector</span>
        <input data-field="itemSelector" type="text" placeholder=".job-card">
      </label>
      <label>
        <span>Title selector</span>
        <input data-field="titleSelector" type="text" placeholder=".job-title">
      </label>
      <label>
        <span>Link selector</span>
        <input data-field="linkSelector" type="text" placeholder="a">
      </label>
      <label>
        <span>Department selector</span>
        <input data-field="departmentSelector" type="text" placeholder=".department">
      </label>
      <label class="wide-field">
        <span>Optional ID selector</span>
        <input data-field="idSelector" type="text" placeholder="[data-job-id]">
        <small class="helper">Without an ID, Career Pulse hashes the title and link.</small>
      </label>
    </div>`;
}

function createSource(type) {
  return {
    id: crypto.randomUUID(),
    type,
    name: `${typeLabels[type]} source`,
    intervalMin: type === "custom" || type === "taleo" ? 15 : 10,
    enabled: true
  };
}

function updateCount() {
  const count = sourceList.children.length;
  sourceCount.textContent = `${count} ${count === 1 ? "source" : "sources"}`;
  emptyState.hidden = count > 0;
}

function renderSource(source) {
  const fragment = sourceTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".source-card");
  card.dataset.sourceId = source.id;
  card.dataset.sourceType = source.type;
  card.querySelector(".source-enabled").checked = source.enabled !== false;
  card.querySelector(".source-name").value = source.name || "";
  card.querySelector(".source-interval").value = source.intervalMin || 10;
  card.querySelector(".type-chip").textContent = typeLabels[source.type];
  const typeFields = card.querySelector(".type-fields");
  typeFields.innerHTML = fieldMarkup(source.type);
  for (const input of typeFields.querySelectorAll("[data-field]")) {
    input.value = source[input.dataset.field] || "";
  }
  card.querySelector(".remove-button").addEventListener("click", () => {
    card.remove();
    updateCount();
  });
  sourceList.append(fragment);
  updateCount();
}

function collectSource(card) {
  const source = {
    id: card.dataset.sourceId,
    type: card.dataset.sourceType,
    name: card.querySelector(".source-name").value.trim(),
    intervalMin: Number(card.querySelector(".source-interval").value),
    enabled: card.querySelector(".source-enabled").checked
  };
  for (const input of card.querySelectorAll("[data-field]")) {
    source[input.dataset.field] = input.value.trim();
  }
  return source;
}

function collectConfig() {
  return {
    telegram: {
      token: botToken.value.trim(),
      chatId: chatId.value.trim()
    },
    sources: [...sourceList.children].map(collectSource)
  };
}

async function requestSourcePermissions(sources) {
  const origins = permissionOrigins(sources);
  if (origins.length === 0) {
    return true;
  }
  return chrome.permissions.request({ origins });
}

function updateTelegramBadge() {
  const ready = botToken.value.trim() && chatId.value.trim();
  telegramBadge.textContent = ready ? "Ready" : "Incomplete";
  telegramBadge.classList.toggle("ready", Boolean(ready));
}

function prepareCompanySource(company) {
  const source = createSource("custom");
  source.name = company.name;
  source.url = company.jobListUrl;
  renderSource(source);
  sourceList.lastElementChild.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
  sourceList.lastElementChild.querySelector(".source-name").focus();
}

function renderJobResources() {
  const container = document.querySelector("#jobResources");
  for (const resource of JOB_RESOURCES) {
    const card = document.createElement("article");
    card.className = "resource-card";
    const content = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = resource.name;
    const description = document.createElement("span");
    description.textContent = resource.description;
    const link = document.createElement("a");
    link.href = resource.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open resource";
    content.append(name, description);
    card.append(content, link);
    container.append(card);
  }
}

function renderCompanyDirectory() {
  const query = companySearch.value.trim().toLowerCase();
  const sector = sectorFilter.value;
  const companies = COMPANY_DIRECTORY.filter((company) => {
    const matchesQuery = `${company.name} ${company.region}`.toLowerCase().includes(query);
    const matchesSector = sector === "all" || company.sector === sector;
    return matchesQuery && matchesSector;
  });
  companyDirectory.replaceChildren();
  directoryCount.textContent = `${companies.length} companies`;
  directoryEmpty.hidden = companies.length > 0;
  for (const company of companies) {
    const card = document.createElement("article");
    card.className = "company-card";
    const content = document.createElement("div");
    const tag = document.createElement("span");
    tag.className = "sector-tag";
    tag.textContent = company.sector;
    const name = document.createElement("h3");
    name.textContent = company.name;
    const region = document.createElement("p");
    region.textContent = company.region;
    const link = document.createElement("a");
    link.className = "company-link";
    link.href = company.jobListUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "View open jobs";
    const careerLink = document.createElement("a");
    careerLink.className = "company-link";
    careerLink.href = company.careerUrl;
    careerLink.target = "_blank";
    careerLink.rel = "noreferrer";
    careerLink.textContent = "Career overview";
    const configure = document.createElement("button");
    configure.className = "configure-button";
    configure.type = "button";
    configure.textContent = "Configure monitor";
    configure.addEventListener("click", () => prepareCompanySource(company));
    content.append(tag, name, region, link);
    if (company.jobListUrl !== company.careerUrl) {
      content.append(careerLink);
    }
    card.append(content, configure);
    companyDirectory.append(card);
  }
}

async function loadSettings() {
  const config = await getConfig();
  botToken.value = config.telegram?.token || "";
  chatId.value = config.telegram?.chatId || "";
  for (const source of config.sources ?? DEFAULT_CONFIG.sources) {
    renderSource(source);
  }
  updateTelegramBadge();
  updateCount();
}

document.querySelectorAll("[data-add-type]").forEach((button) => {
  button.addEventListener("click", () => {
    renderSource(createSource(button.dataset.addType));
    sourceList.lastElementChild.querySelector(".source-name").select();
  });
});

botToken.addEventListener("input", updateTelegramBadge);
chatId.addEventListener("input", updateTelegramBadge);
companySearch.addEventListener("input", renderCompanyDirectory);
sectorFilter.addEventListener("change", renderCompanyDirectory);

document.querySelector("#testTelegram").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  telegramResult.classList.remove("error");
  telegramResult.textContent = "Sending a test message...";
  try {
    const response = await chrome.runtime.sendMessage({
      type: "test-telegram",
      telegram: {
        token: botToken.value.trim(),
        chatId: chatId.value.trim()
      }
    });
    if (!response?.ok) {
      throw new Error(response?.error || "Telegram connection test failed");
    }
    telegramResult.textContent = "Test message sent.";
  } catch (error) {
    telegramResult.textContent = error.message;
    telegramResult.classList.add("error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#saveSettings").addEventListener("click", async () => {
  saveResult.classList.remove("error");
  saveResult.textContent = "Saving...";
  try {
    const config = collectConfig();
    validateConfig(config);
    const permitted = await requestSourcePermissions(config.sources);
    if (!permitted) {
      throw new Error("Host permission was denied");
    }
    await saveConfig(config);
    const response = await chrome.runtime.sendMessage({ type: "sync-config" });
    if (!response.ok) {
      throw new Error(response.error);
    }
    saveResult.textContent = "Settings saved.";
  } catch (error) {
    saveResult.textContent = error.message;
    saveResult.classList.add("error");
  }
});

loadSettings().catch((error) => {
  saveResult.textContent = error.message;
  saveResult.classList.add("error");
});

renderJobResources();
renderCompanyDirectory();
