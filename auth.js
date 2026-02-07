const bcrypt = require("bcrypt");
const { getAsync, runAsync } = require("./db");

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

function requireOwner(req, res, next) {
  if (req.session && req.session.role === "owner") return next();
  return res.status(403).json({ error: "Forbidden" });
}

module.exports = { verifyPassword, requireLogin, requireOwner };
