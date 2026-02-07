const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "site.db");
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

const runAsync = (sql, params = []) =>
  new Promise((res, rej) => {
    db.run(sql, params, function (err) {
      if (err) rej(err);
      else res(this);
    });
  });
const allAsync = (sql, params = []) =>
  new Promise((res, rej) => {
    db.all(sql, params, (err, rows) => {
      if (err) rej(err);
      else res(rows);
    });
  });
const getAsync = (sql, params = []) =>
  new Promise((res, rej) => {
    db.get(sql, params, (err, row) => {
      if (err) rej(err);
      else res(row);
    });
  });

async function ensureSchema() {
  await runAsync(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'friend',
    name TEXT,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    release_notes TEXT,
    site_url TEXT,
    github_url TEXT,
    published INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'contributor',
    contribution TEXT,
    UNIQUE(project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await runAsync(`CREATE TABLE IF NOT EXISTS codes (
    code TEXT PRIMARY KEY,
    created_by INTEGER,
    used INTEGER DEFAULT 0,
    used_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME
  )`);
}

const ready = ensureSchema();

module.exports = {
  db,
  runAsync,
  allAsync,
  getAsync,
  ready,
  filename: DB_PATH,
};
