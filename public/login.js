document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = { username: fd.get("username"), password: fd.get("password") };
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const j = await res.json();
  if (res.ok) {
    // Redirect based on role
    const role = j.role;
    if (role === "owner") {
      window.location = "/dashboard.html";
    } else {
      window.location = "/profile.html";
    }
  } else {
    alert(j.error || "Login failed");
  }
});
