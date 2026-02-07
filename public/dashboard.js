async function api(path, opts = {}) {
  if (!opts.credentials) opts.credentials = "include";
  const res = await fetch(path, opts);
  if (res.status === 401 || res.status === 403) {
    alert("Niet ingelogd of geen toegang");
    window.location = "/login.html";
    throw "unauth";
  }
  return res.json();
}

document.getElementById("logout").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  window.location = "/";
});

document.getElementById("cancel-team-btn").addEventListener("click", () => {
  document.getElementById("team-section").style.display = "none";
});

async function load() {
  const me = await api("/api/me");
  document.getElementById("role").textContent = me.user
    ? me.user.role || ""
    : "";
  if (!me.user) {
    window.location = "/login.html";
    return;
  }
  // Only owner can access dashboard
  if (me.user.role !== "owner") {
    window.location = "/profile.html";
    return;
  }
  if (me.user.role !== "owner") {
    document.getElementById("codes").style.display = "none";
  }
  loadProjects();
  loadCodes();
  loadProfile();
}

async function loadProjects() {
  const res = await api("/api/admin/projects");
  const el = document.getElementById("project-list");
  el.innerHTML = "";
  (res.projects || []).forEach((p) => {
    const r = document.createElement("div");
    r.className = "list-row";
    r.innerHTML = `<div><strong>${p.title}</strong><div class="muted small">${p.slug}</div></div><div><button data-id="${p.id}" class="btn edit">Edit</button> <button data-id="${p.id}" class="btn team">Team</button> <button data-id="${p.id}" class="btn del">Del</button></div>`;
    el.appendChild(r);
  });
  el.querySelectorAll(".edit").forEach((b) =>
    b.addEventListener("click", async (e) => {
      const projectId = e.target.dataset.id;
      const project = (res.projects || []).find((p) => p.id == projectId);
      if (project) {
        const f = document.getElementById("project-form");
        f.title.value = project.title;
        f.slug.value = project.slug;
        f.description.value = project.description || "";
        f.content.value = project.content || "";
        f.release_notes.value = project.release_notes || "";
        f.site_url.value = project.site_url || "";
        f.github_url.value = project.github_url || "";
        f.published.checked = project.published;
        f.dataset.editId = projectId;
        document.querySelector("h5").scrollIntoView();
      }
    }),
  );
  el.querySelectorAll(".team").forEach((b) =>
    b.addEventListener("click", async (e) => {
      const projectId = e.target.dataset.id;
      const project = (res.projects || []).find((p) => p.id == projectId);
      showTeamSection(projectId, project.title);
    }),
  );
  el.querySelectorAll(".del").forEach((b) =>
    b.addEventListener("click", async (e) => {
      if (!confirm("Verwijder?")) return;
      await api("/api/admin/projects/" + e.target.dataset.id, {
        method: "DELETE",
      });
      loadProjects();
    }),
  );
}

document
  .getElementById("project-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: fd.get("title"),
      slug: fd.get("slug"),
      description: fd.get("description"),
      content: fd.get("content"),
      release_notes: fd.get("release_notes"),
      site_url: fd.get("site_url"),
      github_url: fd.get("github_url"),
      published: fd.get("published") ? true : false,
    };
    const editId = e.target.dataset.editId;
    if (editId) {
      await api(`/api/admin/projects/${editId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      delete e.target.dataset.editId;
    } else {
      await api("/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    e.target.reset();
    loadProjects();
  });

async function loadCodes() {
  const el = document.getElementById("codes-list");
  el.innerHTML = "";
  try {
    const res = await api("/api/codes");
    (res.codes || []).forEach((c) => {
      const d = document.createElement("div");
      d.className = "list-row";
      d.innerHTML = `<div>${c.code} <div class="muted small">used: ${c.used}</div></div><div><button data-code="${c.code}" class="btn delcode">Del</button></div>`;
      el.appendChild(d);
    });
    el.querySelectorAll(".delcode").forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Delete code?")) return;
        await api("/api/codes/" + e.target.dataset.code, { method: "DELETE" });
        loadCodes();
      }),
    );
  } catch (err) {}
}

document.getElementById("gen").addEventListener("click", async () => {
  const n = document.getElementById("gen-count").value || 1;
  await api("/api/codes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ count: n }),
  });
  loadCodes();
});

async function loadProfile() {
  try {
    const res = await api("/api/users/me");
    const f = document.getElementById("profile-form");
    if (res.user) {
      f.name.value = res.user.name || "";
      f.bio.value = res.user.bio || "";
    }
  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

document
  .getElementById("profile-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get("name"),
      bio: fd.get("bio"),
      password: fd.get("password"),
    };
    await api("/api/users/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    alert("Profiel bijgewerkt");
  });

let currentProjectId = null;

async function showTeamSection(projectId, projectTitle) {
  currentProjectId = projectId;
  document.getElementById("team-project-title").textContent = projectTitle;
  document.getElementById("team-section").style.display = "block";
  document.getElementById("add-member-form").reset();
  await loadMembers(projectId);
  await loadAvailableUsers(projectId);
}

async function loadMembers(projectId) {
  try {
    const res = await api(`/api/admin/projects/${projectId}/members`);
    const el = document.getElementById("members-list");
    el.innerHTML = "";
    if (!res.members || res.members.length === 0) {
      el.innerHTML = '<p class="muted small">Nog geen teamleden</p>';
      return;
    }
    res.members.forEach((m) => {
      const d = document.createElement("div");
      d.className = "list-row";
      d.style.marginBottom = "12px";
      d.innerHTML = `<div><strong>${m.username}</strong><div class="muted small">${m.role}</div>${m.contribution ? `<div class="muted small">Bijdrage: ${m.contribution}</div>` : ""}</div><div><button data-member-id="${m.id}" class="btn btn-small editmember">Edit</button> <button data-member-id="${m.id}" class="btn btn-small btn-danger delmember">Del</button></div>`;
      el.appendChild(d);
    });
    el.querySelectorAll(".delmember").forEach((b) =>
      b.addEventListener("click", async (e) => {
        if (!confirm("Teamlid verwijderen?")) return;
        await api(
          `/api/admin/projects/${projectId}/members/${e.target.dataset.memberId}`,
          {
            method: "DELETE",
          },
        );
        await loadMembers(projectId);
      }),
    );
    el.querySelectorAll(".editmember").forEach((b) =>
      b.addEventListener("click", async (e) => {
        const memberId = e.target.dataset.memberId;
        const member = res.members.find((m) => m.id == memberId);
        editMember(projectId, member);
      }),
    );
  } catch (err) {
    console.error(err);
  }
}

async function loadAvailableUsers(projectId) {
  try {
    const res = await api("/api/users");
    const select = document.getElementById("member-select");
    const existing = new Set();
    const membersRes = await api(`/api/admin/projects/${projectId}/members`);
    (membersRes.members || []).forEach((m) => existing.add(m.user_id));

    const options = res.users
      .filter((u) => !existing.has(u.id))
      .map((u) => `<option value="${u.id}">${u.username}</option>`)
      .join("");
    select.innerHTML =
      '<option value="">-- Selecteer persoon --</option>' + options;
  } catch (err) {
    console.error(err);
  }
}

document
  .getElementById("add-member-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("member-select").value;
    const role = document.getElementById("member-role").value;
    const contribution = document.getElementById("member-contribution").value;

    if (!userId) {
      alert("Selecteer een teamlid");
      return;
    }

    try {
      await api(`/api/admin/projects/${currentProjectId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, role, contribution }),
      });
      e.target.reset();
      await loadMembers(currentProjectId);
      await loadAvailableUsers(currentProjectId);
    } catch (err) {
      console.error(err);
      alert("Fout bij toevoegen teamlid");
    }
  });

async function editMember(projectId, member) {
  const newRole = prompt("Rol:", member.role);
  if (newRole === null) return;
  const newContribution = prompt("Bijdrage:", member.contribution || "");

  try {
    await api(`/api/admin/projects/${projectId}/members/${member.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole, contribution: newContribution }),
    });
    await loadMembers(projectId);
  } catch (err) {
    console.error(err);
    alert("Fout bij bijwerken teamlid");
  }
}

load();
