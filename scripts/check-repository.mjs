import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  ".editorconfig",
  ".gitattributes",
  ".github/workflows/ci.yml",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "manifest.json",
  "package.json"
];
const runtimeDirectories = ["background", "lib", "offscreen", "options", "popup"];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "dist", "node_modules"].includes(entry.name)) {
      continue;
    }
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(target));
    } else {
      files.push(target);
    }
  }
  return files;
}

for (const file of requiredFiles) {
  await readFile(path.join(root, file));
}

const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, packageJson.version, "Manifest and package versions must match");
assert.equal(manifest.background.type, "module");
assert.ok(Number(manifest.minimum_chrome_version) >= 109);
assert.deepEqual(manifest.optional_host_permissions, ["https://*/*"]);
assert.deepEqual(manifest.host_permissions, [
  "https://boards-api.greenhouse.io/*",
  "https://api.lever.co/*",
  "https://api.telegram.org/*"
]);
assert.equal(
  manifest.content_security_policy.extension_pages,
  "script-src 'self'; object-src 'self'"
);

for (const directory of runtimeDirectories) {
  const files = await walk(path.join(root, directory));
  assert.ok(files.length > 0, `${directory} must not be empty`);
}

const files = await walk(root);
const javascriptFiles = files.filter((file) => /\.(?:js|mjs)$/.test(file));
for (const file of javascriptFiles) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

const htmlFiles = files.filter((file) => file.endsWith(".html"));
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  assert.match(html, /<html\s+lang="en">/i, `${path.relative(root, file)} must declare English`);
}

const publicRuntimeFiles = files.filter((file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  return relative === "manifest.json" || /^(?:background|offscreen|options|popup)\//.test(relative);
});
const nonEnglishCopy = /\b(?:belum|wajib|sumber|lowongan|pemeriksaan|pengaturan|simpan|hapus|aktif|peringatan)\b/i;
for (const file of publicRuntimeFiles) {
  if (!/\.(?:html|js|json)$/.test(file)) {
    continue;
  }
  const content = await readFile(file, "utf8");
  assert.doesNotMatch(
    content,
    nonEnglishCopy,
    `${path.relative(root, file)} contains non-English public copy`
  );
}

const markdownFiles = files.filter((file) => file.endsWith(".md"));
for (const file of markdownFiles) {
  const markdown = await readFile(file, "utf8");
  assert.ok(markdown.endsWith("\n"), `${path.relative(root, file)} must end with a newline`);
}

console.log(
  `Repository checks passed (${javascriptFiles.length} scripts, ${htmlFiles.length} HTML files)`
);
