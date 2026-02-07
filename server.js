require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { db, runAsync, getAsync, allAsync, ready, filename } = require("./db");
const { requireLogin, requireOwner } = require("./auth");

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "change_this";

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: path.join(__dirname, "data"),
    }),
  }),
);

app.use(express.static(path.join(__dirname, "public")));

// Ensure initial owner exists and allow password/name override via INITIAL_OWNER/INITIAL_OWNER_NAME
(async () => {
  await ready;
  if (!process.env.INITIAL_OWNER) return;
  const [u, p] = process.env.INITIAL_OWNER.split(":");
  if (!u || !p) return;
  try {
    const name = process.env.INITIAL_OWNER_NAME || u;
    const user = await getAsync("SELECT * FROM users WHERE username=?", [u]);
    const hash = await bcrypt.hash(p, 10);
    if (user) {
      // update password/name/role to ensure owner retains access
      await runAsync(
        "UPDATE users SET password_hash = ?, role = ?, name = ? WHERE id = ?",
        [hash, "owner", name, user.id],
      );
      console.log("Initial owner updated:", u);
    } else {
      await runAsync(
        "INSERT INTO users (username, password_hash, role, name) VALUES (?,?,?,?)",
        [u, hash, "owner", name],
      );
      console.log("Initial owner created:", u, "with name:", name);
    }
  } catch (err) {
    console.error("Failed to ensure initial owner:", err);
  }
})();

app.get("/api/me", async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const u = await getAsync(
    "SELECT id,username,role,name,bio,created_at FROM users WHERE id=?",
    [req.session.userId],
  );
  res.json({ user: u });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing" });
  const user = await getAsync("SELECT * FROM users WHERE username=?", [
    username,
  ]);
  if (!user) return res.status(400).json({ error: "Invalid" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: "Invalid" });
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ ok: true, role: user.role });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Registration using one-time code
app.post("/api/register", async (req, res) => {
  const { username, password, name, code } = req.body;
  if (!username || !password || !code)
    return res.status(400).json({ error: "Missing" });
  // check code
  const c = await getAsync("SELECT * FROM codes WHERE code=?", [code]);
  if (!c || c.used) return res.status(400).json({ error: "Invalid code" });
  // create user
  const hash = await bcrypt.hash(password, 10);
  try {
    const ins = await runAsync(
      "INSERT INTO users (username, password_hash, role, name) VALUES (?,?,?,?)",
      [username, hash, "friend", name || username],
    );
    // mark code used
    await runAsync(
      "UPDATE codes SET used=1, used_by=?, used_at=CURRENT_TIMESTAMP WHERE code=?",
      [ins.lastID, code],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Username exists" });
  }
});

// Owner-only: manage codes
app.post("/api/codes", requireOwner, async (req, res) => {
  const { count } = req.body;
  const n = parseInt(count) || 1;
  const created = [];
  for (let i = 0; i < n; i++) {
    const code = uuidv4();
    await runAsync("INSERT INTO codes (code, created_by) VALUES (?,?)", [
      code,
      req.session.userId,
    ]);
    created.push(code);
  }
  res.json({ created });
});

app.get("/api/codes", requireOwner, async (req, res) => {
  const rows = await allAsync(
    "SELECT code,used,created_at,used_at FROM codes ORDER BY created_at DESC",
  );
  res.json({ codes: rows });
});

app.delete("/api/codes/:code", requireOwner, async (req, res) => {
  const code = req.params.code;
  await runAsync("DELETE FROM codes WHERE code=?", [code]);
  res.json({ ok: true });
});

// Public: list published projects
app.get("/api/projects", async (req, res) => {
  const rows = await allAsync(
    "SELECT id,title,slug,description FROM projects WHERE published=1 ORDER BY created_at DESC",
  );
  res.json({ projects: rows });
});

// Public: get single project detail
app.get("/api/projects/:slug", async (req, res) => {
  const p = await getAsync(
    "SELECT * FROM projects WHERE slug=? AND published=1",
    [req.params.slug],
  );
  if (!p) return res.status(404).json({ error: "Not found" });
  const members = await allAsync(
    `SELECT u.id, u.username, u.name, u.bio, pm.role, pm.contribution FROM project_members pm 
     JOIN users u ON pm.user_id = u.id WHERE pm.project_id=?`,
    [p.id],
  );
  res.json({ project: p, members });
});

// User profile: get own (must be before :username to match first)
app.get("/api/users/me", requireLogin, async (req, res) => {
  const u = await getAsync(
    "SELECT id,username,role,name,bio,created_at FROM users WHERE id=?",
    [req.session.userId],
  );
  res.json({ user: u });
});

// Public: get user profile
app.get("/api/users/:username", async (req, res) => {
  const u = await getAsync(
    "SELECT id,username,name,bio,created_at FROM users WHERE username=?",
    [req.params.username],
  );
  if (!u) return res.status(404).json({ error: "Not found" });
  const projects = await allAsync(
    `SELECT p.id, p.title, p.slug FROM projects p 
     JOIN project_members pm ON p.id = pm.project_id 
     WHERE pm.user_id=? AND p.published=1`,
    [u.id],
  );
  res.json({ user: u, projects });
});

// Owner: get all users (for team member selection)
app.get("/api/users", requireLogin, requireOwner, async (req, res) => {
  const users = await allAsync(
    "SELECT id, username, name FROM users ORDER BY username",
  );
  res.json({ users });
});

// Owner-only CRUD for projects
app.get("/api/admin/projects", requireOwner, async (req, res) => {
  const rows = await allAsync(
    "SELECT * FROM projects ORDER BY created_at DESC",
  );
  res.json({ projects: rows });
});

app.post("/api/admin/projects", requireOwner, async (req, res) => {
  const {
    title,
    slug,
    description,
    content,
    release_notes,
    site_url,
    github_url,
    published,
  } = req.body;
  if (!title || !slug) return res.status(400).json({ error: "Missing" });
  const p = await runAsync(
    `INSERT INTO projects (title,slug,description,content,release_notes,site_url,github_url,published,updated_at) 
     VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
    [
      title,
      slug,
      description,
      content,
      release_notes,
      site_url,
      github_url,
      published ? 1 : 0,
    ],
  );
  res.json({ id: p.lastID });
});

app.put("/api/admin/projects/:id", requireOwner, async (req, res) => {
  const id = req.params.id;
  const {
    title,
    slug,
    description,
    content,
    release_notes,
    site_url,
    github_url,
    published,
  } = req.body;
  await runAsync(
    `UPDATE projects SET title=?,slug=?,description=?,content=?,release_notes=?,site_url=?,github_url=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [
      title,
      slug,
      description,
      content,
      release_notes,
      site_url,
      github_url,
      published ? 1 : 0,
      id,
    ],
  );
  res.json({ ok: true });
});

app.delete("/api/admin/projects/:id", requireOwner, async (req, res) => {
  const id = req.params.id;
  await runAsync("DELETE FROM projects WHERE id=?", [id]);
  res.json({ ok: true });
});

// Owner: manage project members
app.get("/api/admin/projects/:id/members", requireOwner, async (req, res) => {
  const members = await allAsync(
    `SELECT pm.id, pm.user_id, u.username, u.name, pm.role, pm.contribution FROM project_members pm
     JOIN users u ON pm.user_id = u.id WHERE pm.project_id=?`,
    [req.params.id],
  );
  res.json({ members });
});

app.post("/api/admin/projects/:id/members", requireOwner, async (req, res) => {
  const { user_id, role, contribution } = req.body;
  if (!user_id) return res.status(400).json({ error: "Missing user_id" });
  try {
    await runAsync(
      "INSERT INTO project_members (project_id, user_id, role, contribution) VALUES (?,?,?,?)",
      [req.params.id, user_id, role || "contributor", contribution || null],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Already a member" });
  }
});

app.put(
  "/api/admin/projects/:id/members/:member_id",
  requireOwner,
  async (req, res) => {
    const { role, contribution } = req.body;
    await runAsync(
      "UPDATE project_members SET role=?, contribution=? WHERE id=?",
      [role || "contributor", contribution || null, req.params.member_id],
    );
    res.json({ ok: true });
  },
);

app.delete(
  "/api/admin/projects/:id/members/:member_id",
  requireOwner,
  async (req, res) => {
    await runAsync("DELETE FROM project_members WHERE id=?", [
      req.params.member_id,
    ]);
    res.json({ ok: true });
  },
);

app.put("/api/users/me", requireLogin, async (req, res) => {
  const { name, bio, password } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await runAsync("UPDATE users SET name=?,bio=?,password_hash=? WHERE id=?", [
      name || null,
      bio || null,
      hash,
      req.session.userId,
    ]);
  } else {
    await runAsync("UPDATE users SET name=?,bio=? WHERE id=?", [
      name || null,
      bio || null,
      req.session.userId,
    ]);
  }
  res.json({ ok: true });
});

// Owner: list users
app.get("/api/admin/users", requireOwner, async (req, res) => {
  const rows = await allAsync(
    "SELECT id,username,role,name,created_at FROM users ORDER BY created_at DESC",
  );
  res.json({ users: rows });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("DB:", filename);
});
