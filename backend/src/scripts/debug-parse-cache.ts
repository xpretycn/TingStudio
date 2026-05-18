/**
 * 解析缓存调试脚本
 * 用于排查同一文件二次上传未命中缓存的问题
 *
 * 使用方式: npx tsx src/scripts/debug-parse-cache.ts <文件路径> [callType]
 *   - 文件路径: 测试用 Excel 文件
 *   - callType: parse_formula (默认) 或 parse_nutrition
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { connectDatabase, getDb, query } from "../config/database-better-sqlite3.js";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("请指定测试文件路径: npx tsx src/scripts/debug-parse-cache.ts <file-path> [callType]");
    process.exit(1);
  }

  const callType = process.argv[3] || "parse_formula";
  const userId = "admin"; // 测试用 admin 用户 ID

  if (!fs.existsSync(filePath)) {
    console.error(`文件不存在: ${filePath}`);
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("🔍 解析缓存调试工具");
  console.log("=".repeat(60));
  console.log(`文件路径: ${filePath}`);
  console.log(`文件名: ${path.basename(filePath)}`);
  console.log(`文件大小: ${fs.statSync(filePath).size} bytes`);
  console.log(`CallType: ${callType}`);
  console.log(`测试用户ID: ${userId}`);
  console.log();

  // 1. 计算文件 MD5 哈希
  console.log("─".repeat(40));
  console.log("Step 1: 计算文件 MD5 哈希");
  const fileContent = fs.readFileSync(filePath);
  const fileHash = crypto.createHash("md5").update(fileContent).digest("hex");
  console.log(`文件 MD5: ${fileHash}`);
  console.log();

  // 2. 检查哈希源
  console.log("─".repeat(40));
  console.log("Step 2: 检查 DB 中是否已有匹配记录");

  try {
    await connectDatabase();
    const db = getDb();
    console.log("✅ 数据库连接成功");

    // 检查 parse_results 表是否存在
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='parse_results'"
    ).all();
    if (tableExists.length === 0) {
      console.error("❌ parse_results 表不存在！请先运行迁移脚本");
      process.exit(1);
    }
    console.log("✅ parse_results 表存在");
    console.log();

    // 2a. 按 file_hash 精确匹配
    console.log("─".repeat(40));
    console.log("Step 2a: 精确匹配 (user_id + file_hash + call_type)");
    const exactMatch = db.prepare(`
      SELECT id, file_hash, file_name, status, call_type, used_count, created_at
      FROM parse_results
      WHERE user_id = ? AND file_hash = ? AND call_type = ?
      ORDER BY created_at DESC
    `).all(userId, fileHash, callType);

    if (exactMatch.length > 0) {
      console.log(`✅ 找到 ${exactMatch.length} 条精确匹配记录:`);
      exactMatch.forEach((r: any) => {
        console.log(`   - ID: ${r.id} | 哈希: ${r.file_hash} | 文件名: ${r.file_name} | 状态: ${r.status} | 使用次数: ${r.used_count} | 创建时间: ${r.created_at}`);
      });
    } else {
      console.log("❌ 无精确匹配记录");
    }
    console.log();

    // 2b. 按文件名模糊匹配
    const fileName = path.basename(filePath);
    console.log("─".repeat(40));
    console.log(`Step 2b: 按文件名模糊匹配 (${fileName})`);
    const nameMatch = db.prepare(`
      SELECT id, file_hash, file_name, status, call_type, used_count, created_at
      FROM parse_results
      WHERE user_id = ? AND file_name LIKE ? AND call_type = ?
      ORDER BY created_at DESC
    `).all(userId, `%${fileName}%`, callType);

    if (nameMatch.length > 0) {
      console.log(`✅ 找到 ${nameMatch.length} 条文件名匹配记录:`);
      nameMatch.forEach((r: any) => {
        const matchStr = r.file_hash === fileHash ? "← 哈希匹配" : "← 哈希不同";
        console.log(`   - ID: ${r.id} | 哈希: ${r.file_hash} | 文件名: ${r.file_name} | 状态: ${r.status} | ${r.created_at} ${matchStr}`);
      });
    } else {
      console.log("❌ 无文件名匹配记录");
    }
    console.log();

    // 2c. 检查所有 parse_results 记录
    console.log("─".repeat(40));
    console.log("Step 2c: parse_results 表中所有记录");
    const allRecords = db.prepare(`
      SELECT id, file_hash, file_name, call_type, status, used_count, created_at
      FROM parse_results
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId);

    if (allRecords.length > 0) {
      console.log(`共 ${allRecords.length} 条记录 (显示最近 20 条):`);
      allRecords.forEach((r: any) => {
        const hashMatch = r.file_hash === fileHash ? "★ 与测试文件哈希一致" : "";
        console.log(`   [${r.created_at}] ${r.call_type} | ${r.file_name} | hash:${r.file_hash.substring(0, 12)}... | ${r.status} ${hashMatch}`);
      });
    } else {
      console.log("❌ parse_results 表中无任何记录");
    }
    console.log();

    // 3. 模拟缓存检查
    console.log("─".repeat(40));
    console.log("Step 3: 模拟缓存查询");
    const cachedRows = db.prepare(`
      SELECT id, parsed_result, model_name, tokens_used FROM parse_results
      WHERE user_id = ? AND file_hash = ? AND status = 'success' AND call_type = ?
      ORDER BY created_at DESC LIMIT 1
    `).all(userId, fileHash, callType);

    if (cachedRows.length > 0) {
      console.log("✅ 缓存命中！缓存检查应返回已有结果，跳过 AI 调用");
      console.log(`   记录 ID: ${cachedRows[0].id}`);
    } else {
      console.log("❌ 缓存未命中！将在缓存检查处通过，继续 AI 调用");

      // 检查可能的原因
      console.log("\n   可能的原因:");

      // 检查哈希是否匹配
      const hashCheck = db.prepare(`
        SELECT file_hash FROM parse_results
        WHERE user_id = ? AND call_type = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, callType) as any;

      if (hashCheck) {
        if (hashCheck.file_hash !== fileHash) {
          console.log(`   →  DB 中最新的记录哈希是 "${hashCheck.file_hash}", 当前文件哈希是 "${fileHash}"`);
          console.log(`      两者不匹配！`);

          // 分析哈希差异原因
          if (hashCheck.file_hash.length === 32 && fileHash.length === 32) {
            console.log(`      两个都是 MD5 (32位 hex), 但内容不同`);
          } else {
            console.log(`      哈希长度不同或格式不同`);
          }
        } else {
          console.log(`   →  哈希匹配但状态可能不是 'success'`);
        }
      }

      // 检查是否有状态不是 'success' 的记录
      const failedRecords = db.prepare(`
        SELECT id, status FROM parse_results
        WHERE user_id = ? AND file_hash = ? AND call_type = ?
        ORDER BY created_at DESC
      `).all(userId, fileHash, callType) as any[];

      if (failedRecords.length > 0) {
        failedRecords.forEach((r: any) => {
          if (r.status !== 'success') {
            console.log(`   →  存在状态为 "${r.status}" 的记录 (id: ${r.id}), 缓存查询需 status='success'`);
          }
        });
      }
    }

    console.log();
    console.log("=".repeat(60));
    console.log("📋 诊断完成");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ 错误:", error);
  }
}

main().catch(console.error);
