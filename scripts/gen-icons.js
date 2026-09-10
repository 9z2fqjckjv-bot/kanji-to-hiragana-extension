/**
 * Write PNG icons from scripts/icons-b64.json (keeps the repo text-only).
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "icons-b64.json");
const outDir = path.join(__dirname, "..", "src", "icons");
const data = JSON.parse(fs.readFileSync(src, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
for (const [name, b64] of Object.entries(data)) {
  fs.writeFileSync(path.join(outDir, name), Buffer.from(b64, "base64"));
}
console.log("icons written to", outDir);
