function telegramUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function callTelegram(token, method, body) {
  const response = await fetch(telegramUrl(token, method), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram HTTP ${response.status}`);
  }
  return result.result;
}

export function isTelegramReady(config) {
  return Boolean(config?.token?.trim() && config?.chatId?.trim());
}

export async function sendTelegram(config, text) {
  if (!isTelegramReady(config)) {
    throw new Error("Telegram belum dikonfigurasi");
  }
  return callTelegram(config.token.trim(), "sendMessage", {
    chat_id: config.chatId.trim(),
    text,
    disable_web_page_preview: true
  });
}

export async function testTelegram(config) {
  return sendTelegram(
    config,
    "Career Pulse terhubung. Alert lowongan siap dikirim."
  );
}

export function formatJobAlert(source, job) {
  const lines = [
    "Lowongan baru",
    source.name,
    job.title
  ];
  if (job.department) {
    lines.push(job.department);
  }
  lines.push(job.url);
  return lines.join("\n");
}

export function formatSourceWarning(source) {
  return [
    "Peringatan Career Pulse",
    source.name,
    "Selector tidak menemukan lowongan selama dua pemeriksaan.",
    "Periksa konfigurasi selector situs."
  ].join("\n");
}
