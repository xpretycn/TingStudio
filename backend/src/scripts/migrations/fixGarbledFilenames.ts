import { getDb, connectDatabase } from "../../config/database-better-sqlite3.js";

connectDatabase();

function fixMulterOriginalname(originalname: string): string {
  if (!originalname) return originalname;
  
  try {
    // 如果已经是正常的中文文件名，直接返回
    if (/[\u4e00-\u9fff]/.test(originalname)) {
      return originalname;
    }
    
    // 常见的乱码编码方式列表
    const encodings = [
      { from: 'latin1', to: 'utf8' },
      { from: 'binary', to: 'utf8' },
      { from: 'win1252', to: 'utf8' },
      { from: 'iso-8859-1', to: 'utf8' },
      { from: 'cp1252', to: 'utf8' },
    ];
    
    let bestResult = originalname;
    let bestScore = 0;
    
    for (const { from, to } of encodings) {
      try {
        const fixed = Buffer.from(originalname, from as BufferEncoding).toString(to as BufferEncoding);
        
        // 如果转换后包含中文字符，且没有替换字符，认为是成功的转换
        if (fixed !== originalname && !/\ufffd/.test(fixed)) {
          const hasChinese = /[\u4e00-\u9fff]/.test(fixed);
          const chineseCount = (fixed.match(/[\u4e00-\u9fff]/g) || []).length;
          
          // 计算得分：中文越多，得分越高
          const score = chineseCount * 10;
          
          if (score > bestScore && hasChinese) {
            bestResult = fixed;
            bestScore = score;
          }
        }
      } catch {
        continue;
      }
    }
    
    // 如果找到了更好的结果，且结果合理，返回修复后的版本
    if (bestScore > 0) {
      return bestResult;
    }
    
    return originalname;
  } catch {
    return originalname;
  }
}

function isLikelyGarbled(text: string): boolean {
  if (!text) return false;
  
  // 如果包含替换字符，很可能是乱码
  if (/\ufffd/.test(text)) {
    return true;
  }
  
  // 如果同时包含中文和高位的西欧字符，很可能是乱码
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasHighCode = /[\u0080-\u00FF]/.test(text);
  
  if (hasChinese && hasHighCode) {
    return true;
  }
  
  // 如果包含大量西欧字符（超过30%），且没有正常的中文，可能是乱码
  const westernChars = (text.match(/[\u00C0-\u00FF]/g) || []).length;
  if (westernChars > text.length * 0.3 && !hasChinese) {
    return true;
  }
  
  return false;
}

function extractFilenameFromSummary(summary: string): string | null {
  if (!summary) return null;
  
  // 尝试从 request_summary 中提取文件名
  // 格式：解析配方文件: 文件名.xlsx
  // 格式：解析原料营养文件: 文件名.xlsx
  const patterns = [
    /解析配方文件:\s*(.+)/,
    /解析原料营养文件:\s*(.+)/,
    /图片内容提取:\s*(.+)/,
  ];
  
  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

async function migrateFixGarbledFilenames() {
  console.log("开始迁移：修复 ai_usage_logs 中 request_summary 的中文文件名乱码...\n");

  try {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT id, request_summary FROM ai_usage_logs WHERE request_summary IS NOT NULL AND request_summary != ''`
      )
      .all() as any[];

    console.log(`找到 ${rows.length} 条含 request_summary 的记录\n`);

    const updateStmt = db.prepare(
      `UPDATE ai_usage_logs SET request_summary = ? WHERE id = ?`
    );

    const fixMany = db.transaction((items: { id: string; oldSummary: string; fixedSummary: string }[]) => {
      for (const item of items) {
        updateStmt.run(item.fixedSummary, item.id);
      }
    });

    const toFix: { id: string; oldSummary: string; fixedSummary: string }[] = [];

    for (const row of rows) {
      const originalSummary = row.request_summary;
      
      // 如果已经是正常的，直接跳过
      if (!isLikelyGarbled(originalSummary)) {
        continue;
      }
      
      // 尝试提取文件名并修复
      const filename = extractFilenameFromSummary(originalSummary);
      
      if (!filename) {
        console.log(`⚠️  无法从 "${originalSummary}" 中提取文件名，跳过`);
        continue;
      }
      
      const fixedFilename = fixMulterOriginalname(filename);
      
      if (fixedFilename === filename) {
        console.log(`⚠️  文件名 "${filename}" 无需修复，跳过`);
        continue;
      }
      
      // 替换 summary 中的文件名
      let fixedSummary = originalSummary;
      
      // 替换各种前缀后的文件名
      const prefixes = ['解析配方文件: ', '解析原料营养文件: ', '图片内容提取: '];
      for (const prefix of prefixes) {
        if (originalSummary.includes(prefix + filename)) {
          fixedSummary = originalSummary.replace(prefix + filename, prefix + fixedFilename);
          break;
        }
      }
      
      if (fixedSummary !== originalSummary) {
        toFix.push({
          id: row.id,
          oldSummary: originalSummary,
          fixedSummary,
        });
        
        console.log(`✅ 修复:`);
        console.log(`   原: "${originalSummary}"`);
        console.log(`   新: "${fixedSummary}"\n`);
      }
    }

    if (toFix.length > 0) {
      fixMany(toFix);
      console.log(`\n✅ 成功修复 ${toFix.length} 条乱码记录！`);
    } else {
      console.log(`\n✅ 无需修复，所有记录编码正常或无法提取文件名。`);
    }
  } catch (error: any) {
    console.error(`\n❌ 迁移失败:`, error.message);
    throw error;
  }
}

migrateFixGarbledFilenames()
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n迁移失败:", err);
    process.exit(1);
  });
