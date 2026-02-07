async function load() {
  const res = await fetch("/api/projects");
  const data = await res.json();
  const el = document.getElementById("projects");
  el.innerHTML = "";
  (data.projects || []).forEach((p) => {
    const d = document.createElement("a");
    d.href = `/project.html?slug=${p.slug}`;
    d.className = "project-card";
    d.innerHTML = `<h4 class="project-title">${p.title}</h4><div class="project-description">${
      p.description || "Geen beschrijving"
    }</div><div class="muted small">Klik voor meer informatie</div>`;
    el.appendChild(d);
  });
}
load();
