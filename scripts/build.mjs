import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "career-pulse");
const runtimeEntries = [
  "background",
  "lib",
  "offscreen",
  "options",
  "popup",
  "manifest.json"
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of runtimeEntries) {
  await cp(path.join(root, entry), path.join(output, entry), {
    recursive: true
  });
}

const manifest = JSON.parse(await readFile(path.join(output, "manifest.json"), "utf8"));
console.log(`Built Career Pulse ${manifest.version} at ${path.relative(root, output)}`);
