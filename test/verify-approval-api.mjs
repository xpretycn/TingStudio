const BASE = "http://localhost:3000/api";

async function main() {
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.data?.token;
  console.log("=== 1. pending-review ===");
  const prRes = await fetch(`${BASE}/versions/pending-review`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const prData = await prRes.json();
  console.log(JSON.stringify(prData?.data || prData, null, 2).substring(0, 300));

  console.log("\n=== 2. my-submissions ===");
  const msRes = await fetch(`${BASE}/versions/my-submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const msData = await msRes.json();
  console.log(JSON.stringify(msData?.data || msData, null, 2).substring(0, 300));
  console.log("\nDone.");
}

main().catch(console.error);