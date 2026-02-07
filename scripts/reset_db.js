const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

try {
  if (fs.existsSync(dataDir)) {
    console.log("Removing data directory:", dataDir);
    fs.rmSync(dataDir, { recursive: true, force: true });
  } else {
    console.log("No data directory found, skipping removal");
  }
} catch (err) {
  console.error("Failed to remove data directory:", err);
  process.exit(1);
}

console.log("Re-initializing database with init_db.js");
const r = spawnSync(process.execPath, ["init_db.js"], {
  cwd: root,
  stdio: "inherit",
});
if (r.error) {
  console.error("Failed to run init_db.js:", r.error);
  process.exit(1);
}
process.exit(r.status || 0);
