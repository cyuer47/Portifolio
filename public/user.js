const username =
  new URLSearchParams(window.location.search).get("username") ||
  window.location.pathname.split("/").pop();

async function load() {
  try {
    const res = await fetch(`/api/users/${username}`);
    if (!res.ok) {
      document.body.innerHTML = `<div class="container"><div class="card"><h2>Gebruiker niet gevonden</h2></div></div>`;
      return;
    }
    const { user, projects } = await res.json();

    document.getElementById("avatar").textContent = (user.name || user.username)
      .charAt(0)
      .toUpperCase();
    document.getElementById("username").textContent = user.username;
    document.getElementById("name").textContent = user.name || user.username;
    document.getElementById("bio").textContent = user.bio || "Geen bio";
    const joined = new Date(user.created_at).toLocaleDateString("nl-NL");
    document.getElementById("joined").textContent = `Lid sinds ${joined}`;

    if (projects && projects.length > 0) {
      document.getElementById("projects-section").style.display = "block";
      const projectsDiv = document.getElementById("projects");
      projectsDiv.innerHTML = "";
      projects.forEach((p) => {
        const card = document.createElement("a");
        card.href = `/project.html?slug=${p.slug}`;
        card.className = "project-card";
        card.innerHTML = `
          <h4 class="project-title">${p.title}</h4>
          <div class="muted small">Klik voor meer informatie</div>
        `;
        projectsDiv.appendChild(card);
      });
    }
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<div class="container"><div class="card"><h2>Fout bij laden profiel</h2></div></div>`;
  }
}

load();
