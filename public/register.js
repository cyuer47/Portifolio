document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    username: fd.get("username"),
    password: fd.get("password"),
    name: fd.get("name"),
    code: fd.get("code"),
  };
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const j = await res.json();
  if (res.ok) {
    alert("Registratie gelukt — je kunt nu inloggen");
    window.location = "/login.html";
  } else {
    alert(j.error || "Fout");
  }
});
