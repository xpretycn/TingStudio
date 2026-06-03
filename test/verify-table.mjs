// 测试 PDF 表格
import fs from "fs";
const BASE = "http://localhost:3000/api";

async function main() {
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.data?.token;
  if (!token) return;

  const res = await fetch(`${BASE}/nutrition/material/moohvakn36x4p3od/sources/export?format=pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", res.status);
  if (res.status === 200) {
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync("d:/Program Data/workspace-codebd/TingStudio/test/pdf-table-test.pdf", buf);
    console.log(`PDF size: ${buf.length} bytes`);
  } else {
    console.log("Error:", await res.text());
  }
}
main().catch(console.error);
