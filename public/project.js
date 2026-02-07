const slug =
  new URLSearchParams(window.location.search).get("slug") ||
  window.location.pathname.split("/").pop();

async function load() {
  try {
    const res = await fetch(`/api/projects/${slug}`);
    if (!res.ok) {
      document.body.innerHTML = `<div class="container"><div class="card"><h2>Project niet gevonden</h2></div></div>`;
      return;
    }
    const { project, members } = await res.json();

    document.getElementById("title").textContent = project.title;
    document.getElementById("project-title").textContent = project.title;
    document.getElementById("status").textContent = project.published
      ? "Gepubliceerd"
      : "Concept";
    document.getElementById("description").textContent =
      project.description || "Geen beschrijving";

    if (project.content) {
      document.getElementById("content-section").style.display = "block";
      document.getElementById("content").innerHTML = project.content;
    }

    if (project.release_notes) {
      document.getElementById("release-notes-section").style.display = "block";
      document.getElementById("release-notes").innerHTML =
        project.release_notes;
    }

    if (project.site_url || project.github_url) {
      const linksDiv = document.getElementById("links");
      linksDiv.innerHTML = "";
      if (project.site_url) {
        const a = document.createElement("a");
        a.href = project.site_url;
        a.target = "_blank";
        a.className = "btn btn-outline";
        a.textContent = "Website";
        a.style.display = "inline-block";
        a.style.marginRight = "8px";
        linksDiv.appendChild(a);
      }
      if (project.github_url) {
        const a = document.createElement("a");
        a.href = project.github_url;
        a.target = "_blank";
        a.className = "btn btn-outline";
        a.textContent = "GitHub";
        a.style.display = "inline-block";
        linksDiv.appendChild(a);
      }
      if (project.site_url || project.github_url) {
        document.getElementById("links-section").style.display = "block";
      }
    }

    if (members && members.length > 0) {
      document.getElementById("members-section").style.display = "block";
      const membersDiv = document.getElementById("members");
      membersDiv.innerHTML = "";
      members.forEach((m) => {
        const card = document.createElement("a");
        card.href = `/user.html?username=${m.username}`;
        card.className = "project-card";
        card.style.textDecoration = "none";
        card.style.color = "inherit";
        card.innerHTML = `
          <div class="profile-avatar" style="width: 60px; height: 60px; font-size: 1.25rem; margin-bottom: 8px;">
            ${(m.name || m.username).charAt(0).toUpperCase()}
          </div>
          <h4 style="margin: 0 0 4px 0;">${m.name || m.username}</h4>
          <div class="muted small">${m.role}</div>
          <div class="muted small" style="margin-top: 4px;">${m.contribution || "Geen bijdrage opgegeven"}</div>
        `;
        membersDiv.appendChild(card);
      });
    }
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<div class="container"><div class="card"><h2>Fout bij laden project</h2></div></div>`;
  }
}

load();
