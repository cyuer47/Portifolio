const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const env = require("dotenv").config().parsed;
const db = new sqlite3.Database("./data/site.db");

// Update henk's password to test123
const username = process.env.INITIAL_OWNER_USERNAME || "henk";
const password = process.env.INITIAL_OWNER_PASSWORD || "henk123";

(async () => {
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      "UPDATE users SET password_hash = ? WHERE username = ?",
      [hash, "henk"],
      function (err) {
        if (err) {
          console.error("Error updating password:", err);
        } else if (this.changes === 0) {
          console.error("No user updated (username not found): ---");
        } else {
          console.log("Password updated! Use username: ---, password: ---");
        }
        db.close();
      },
    );
  } catch (err) {
    console.error("Error hashing password:", err);
    db.close();
  }
})();
