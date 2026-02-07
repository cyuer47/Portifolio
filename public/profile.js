async function api(path, opts = {}) {
  if (!opts.credentials) opts.credentials = "include";
  const res = await fetch(path, opts);
  if (res.status === 401 || res.status === 403) {
    alert("Niet ingelogd");
    window.location = "/login.html";
    throw "unauth";
  }
  return res.json();
}

document.getElementById("logout").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  window.location = "/";
});

async function load() {
  const me = await api("/api/me");
  if (!me.user) {
    window.location = "/login.html";
    return;
  }

  document.getElementById("role").textContent = me.user.role || "gebruiker";
  document.getElementById("username").value = me.user.username;

  const f = document.getElementById("profile-form");
  f.name.value = me.user.name || "";
  f.bio.value = me.user.bio || "";

  // Load their projects if they're a contributor
  try {
    const projectsRes = await fetch(
      `/api/users/${me.user.username}?credentials=include`,
      { credentials: "include" },
    );
    if (projectsRes.ok) {
      const { projects } = await projectsRes.json();
      if (projects && projects.length > 0) {
        document.getElementById("projects-section").style.display = "block";
        const el = document.getElementById("projects");
        el.innerHTML = "";
        projects.forEach((p) => {
          const card = document.createElement("a");
          card.href = `/project.html?slug=${p.slug}`;
          card.className = "project-card";
          card.innerHTML = `<h4 class="project-title">${p.title}</h4>`;
          el.appendChild(card);
        });
      }
    }
  } catch (err) {
    console.error("Could not load projects:", err);
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
    try {
      await api("/api/users/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      alert("Profiel opgeslagen!");
    } catch (err) {
      alert("Fout bij opslaan");
    }
  });

load();
