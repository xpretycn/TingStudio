import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(import.meta.dirname);

function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile() && fullPath.endsWith(".ts") && !fullPath.endsWith(".d.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = walkDir(SRC_DIR);
let totalFixed = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Skip files that don't reference database-better-sqlite3
  if (!content.includes("database-better-sqlite3")) continue;

  // Determine the relative path depth for the import
  const relPath = path.relative(path.dirname(filePath), SRC_DIR).replace(/\\/g, "/");
  let adapterImportPath: string;
  if (relPath === "") {
    adapterImportPath = "./config/database-adapter.js";
  } else {
    adapterImportPath = `${relPath}/config/database-adapter.js`;
  }

  // Replace all variations of the import
  const importPattern = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*database-better-sqlite3\.js['"];?/g;

  content = content.replace(importPattern, (match, imports: string) => {
    const importList = imports.split(",").map((s: string) => s.trim()).filter(Boolean);
    const newImports: string[] = [];

    for (const imp of importList) {
      const name = imp.replace(/\s+as\s+\w+/, "").trim();
      if (name === "getDb" || name === "connectDatabase") {
        // Skip these, they don't exist in MySQL adapter
        if (!newImports.includes("query")) newImports.push("query");
        if (!newImports.includes("execute")) newImports.push("execute");
      } else if (name === "transaction") {
        newImports.push("transactionAsync");
      } else {
        newImports.push(imp.trim());
      }
    }

    changed = true;
    return `import { ${newImports.join(", ")} } from '${adapterImportPath}';`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    totalFixed++;
    console.log(`FIXED: ${path.relative(SRC_DIR, filePath)}`);
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
