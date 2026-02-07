const db = require("./db");

async function init() {
  try {
    await db.ready;
    console.log("Database initialized at", db.filename);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

init();
