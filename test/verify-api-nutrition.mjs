const BASE = "http://localhost:3000/api";

async function main() {
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.data?.token;
  console.log("Token:", token ? `${token.substring(0, 20)}...` : "NULL");

  const matRes = await fetch(`${BASE}/materials?page=1&pageSize=2`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const matData = await matRes.json();
  const materials = matData.data?.list || matData.list || [];
  console.log(`Materials count: ${materials.length}`);

  for (const mat of materials) {
    const nutRes = await fetch(`${BASE}/nutrition/material/${mat.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const nutData = await nutRes.json();
    const nutrition = nutData.data || nutData;
    console.log(`\n${mat.name} (${mat.id}):`);
    if (nutrition?.per100g) {
      console.log("  per100g:", JSON.stringify(nutrition.per100g));
    } else {
      console.log("  NO NUTRITION DATA:", JSON.stringify(nutrition));
    }
  }
  console.log("\nDone.");
}

main().catch(console.error);