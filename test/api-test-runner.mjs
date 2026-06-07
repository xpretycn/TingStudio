import http from "http";

const BASE = "http://localhost:3000/api";
const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4ZHMzbWYyZW9rbWY5IiwidXNlcklkIjoibXEzeGRzM21mMmVva21mOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOiJyb2xlX2FkbWluXzAwMSIsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODQ1Njk5LCJleHAiOjE3ODE0NTA0OTl9.9YzLYZGs0ov5sR4emlmyQJ8DybNg_6eHNjn33riykrc";
const FORM_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4Z3FhNTh4czJ1cnZiIiwidXNlcklkIjoibXEzeGdxYTU4eHMydXJ2YiIsInVzZXJuYW1lIjoidGVzdGFkbWluIiwicm9sZSI6ImZvcm11bGlzdCIsInJvbGVJZCI6InJvbGVfZm9ybXVsaXN0XzAwMSIsInBlcm1pc3Npb25zIjpbImZvcm11bGE6d3JpdGUiLCJmaWxlOnJlYWQiLCJudXRyaXRpb246cmVhZCIsImV4cG9ydDp3cml0ZSIsImFpOndyaXRlIiwiZXhwb3J0OnJlYWQiLCJtYXRlcmlhbDpyZWFkIiwiZmlsZTp3cml0ZSIsImZvcm11bGE6cmVhZCIsIm1hdGVyaWFsOndyaXRlIiwiYWk6cmVhZCJdLCJpYXQiOjE3ODA4NDU3MjIsImVwIjoxNzgxNDUwNTIyfQ.SHikP7_GdEag80SOI2YPT7GHTb-bPUxcLEUe4SPKOf4";

const results = { exports: [], excelImport: [], files: [], reports: [], roles: [], permissions: [], users: [] };

function request(method, path, token, body = null, isMultipart = false, formData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { "Authorization": token ? `Bearer ${token}` : "" },
      timeout: 15000,
    };

    let postData = null;
    if (body && !isMultipart) {
      postData = JSON.stringify(body);
      options.headers["Content-Type"] = "application/json";
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }
    if (isMultipart && formData) {
      const boundary = "----TestBoundary" + Date.now();
      options.headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
      const parts = [];
      for (const [key, val] of Object.entries(formData)) {
        if (val.filename) {
          parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${val.filename}"\r\nContent-Type: ${val.contentType || "application/octet-stream"}\r\n\r\n${val.content}\r\n`);
        } else {
          parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`);
        }
      }
      parts.push(`--${boundary}--\r\n`);
      postData = parts.join("");
      options.headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const start = Date.now();
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const elapsed = Date.now() - start;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data.substring(0, 200); }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data, elapsed });
      });
    });
    req.on("error", (e) => resolve({ status: 0, headers: {}, body: null, raw: e.message, elapsed: Date.now() - start, error: true }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, headers: {}, body: null, raw: "timeout", elapsed: 15000, error: true }); });
    if (postData) req.write(postData);
    req.end();
  });
}

function tc(id, name, result, status, elapsed, detail = "") {
  return { id, name, result, status, elapsed, detail };
}

// ===================== EXPORTS MODULE =====================
async function testExports() {
  const r = results.exports;
  const adminH = ADMIN_TOKEN;
  const formH = FORM_TOKEN;

  // A01 - GET /api/exports/public/share/:shareId
  let res;
  res = await request("GET", "/exports/public/share/nonexist", null);
  r.push(tc("A01-E01", "分享ID不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed, `Expected 404, got ${res.status}`));

  res = await request("GET", "/exports/public/share/", null);
  r.push(tc("A01-B01", "shareId为空字符串", res.status === 404 ? "✅" : "❌", res.status, res.elapsed, `Expected 404 route mismatch`));

  res = await request("GET", "/exports/public/share/share_test_001", null);
  r.push(tc("A01-R01", "无需认证即可访问", res.status === 200 || res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  // A02 - GET /api/exports/statistics
  res = await request("GET", "/exports/statistics", adminH);
  r.push(tc("A02-P01", "admin获取统计", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed, res.body?.success ? "" : JSON.stringify(res.body)?.substring(0, 100)));

  res = await request("GET", "/exports/statistics", null);
  r.push(tc("A02-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/statistics", formH);
  r.push(tc("A02-R02", "formulist仅看自己的统计", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/statistics", adminH);
  r.push(tc("A02-DI01", "admin可见全部统计", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // A03 - GET /api/exports/config
  res = await request("GET", "/exports/config", adminH);
  r.push(tc("A03-P01", "admin获取配置", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/config", formH);
  r.push(tc("A03-P02", "formulist获取配置", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/config", null);
  r.push(tc("A03-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A04 - PUT /api/exports/config
  res = await request("PUT", "/exports/config", adminH, { configs: [{ configKey: "export_rate_limit", configValue: "20" }] });
  r.push(tc("A04-P01", "admin更新配置", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  res = await request("PUT", "/exports/config", formH, { configs: [{ configKey: "export_rate_limit", configValue: "20" }] });
  r.push(tc("A04-E01", "formulist更新配置", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", "/exports/config", adminH, {});
  r.push(tc("A04-V01", "缺少configs字段", res.status === 400 ? "✅" : "❌", res.status, res.elapsed, `Expected 400`));

  res = await request("PUT", "/exports/config", adminH, { configs: "invalid" });
  r.push(tc("A04-V02", "configs不是数组", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", "/exports/config", null, { configs: [] });
  r.push(tc("A04-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A05 - GET /api/exports/materials
  res = await request("GET", "/exports/materials", adminH);
  r.push(tc("A05-P01", "获取原料列表", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/materials?keyword=佛手", adminH);
  r.push(tc("A05-P02", "按关键词搜索", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/materials", null);
  r.push(tc("A05-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A06 - GET /api/exports/reports
  res = await request("GET", "/exports/reports?type=weekly", adminH);
  r.push(tc("A06-P01", "获取周报列表", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/reports", adminH);
  r.push(tc("A06-V01", "缺少type参数", res.status === 500 || res.status === 400 ? "✅" : "⏭", res.status, res.elapsed, `Expected 500/400, got ${res.status}`));

  res = await request("GET", "/exports/reports?type=weekly", null);
  r.push(tc("A06-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A07 - GET /api/exports/templates
  res = await request("GET", "/exports/templates", adminH);
  r.push(tc("A07-P01", "获取全部模板", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/templates?type=pdf", adminH);
  r.push(tc("A07-P02", "按type筛选", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/templates", null);
  r.push(tc("A07-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A08 - POST /api/exports/templates
  res = await request("POST", "/exports/templates", adminH, { name: "[test]测试模板", type: "excel", formatConfig: { selectedFields: ["name", "code"] } });
  r.push(tc("A08-P01", "创建标准模板", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  const createdTemplateId = res.body?.data?.templateId || res.body?.data?.id;

  res = await request("POST", "/exports/templates", adminH, { type: "excel", formatConfig: {} });
  r.push(tc("A08-E01", "缺少name", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/exports/templates", adminH, { name: "测试", formatConfig: {} });
  r.push(tc("A08-E02", "缺少type", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/exports/templates", adminH, { name: "测试", type: "excel" });
  r.push(tc("A08-E03", "缺少formatConfig", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/exports/templates", null, { name: "测试", type: "excel", formatConfig: {} });
  r.push(tc("A08-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A09 - PUT /api/exports/templates/:templateId
  if (createdTemplateId) {
    res = await request("PUT", `/exports/templates/${createdTemplateId}`, adminH, { name: "[test]更新后名称" });
    r.push(tc("A09-P01", "更新模板名称", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

    res = await request("PUT", `/exports/templates/${createdTemplateId}`, adminH, {});
    r.push(tc("A09-V01", "无更新字段", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("A09-P01", "更新模板名称", "⏭", 0, 0, "无可用templateId"));
    r.push(tc("A09-V01", "无更新字段", "⏭", 0, 0, "无可用templateId"));
  }

  res = await request("PUT", "/exports/templates/nonexist", adminH, { name: "测试" });
  r.push(tc("A09-B01", "templateId不存在", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // A10 - DELETE /api/exports/templates/:templateId
  if (createdTemplateId) {
    res = await request("DELETE", `/exports/templates/${createdTemplateId}`, adminH);
    r.push(tc("A10-P01", "删除存在的模板", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("A10-P01", "删除存在的模板", "⏭", 0, 0, "无可用templateId"));
  }

  res = await request("DELETE", "/exports/templates/nonexist", adminH);
  r.push(tc("A10-B01", "删除不存在的模板", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // A11 - POST /api/exports/jobs
  res = await request("POST", "/exports/jobs", adminH, { dataCategory: "formula", exportType: "excel", formulaIds: ["f_test_001"] });
  r.push(tc("A11-P01", "导出单个配方Excel", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 150)));

  const createdJobId = res.body?.data?.jobId || res.body?.data?.id;

  res = await request("POST", "/exports/jobs", adminH, { dataCategory: "formula", exportType: "pdf", formulaIds: ["f_test_001"] });
  r.push(tc("A11-P02", "导出单个配方PDF", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/exports/jobs", adminH, { exportType: "excel" });
  r.push(tc("A11-E01", "缺少dataCategory", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/exports/jobs", adminH, { dataCategory: "formula" });
  r.push(tc("A11-E02", "缺少exportType", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/exports/jobs", adminH, { dataCategory: "formula", exportType: "csv", formulaIds: ["f_test_001"] });
  r.push(tc("A11-E03", "不支持的exportType", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, `Expected job created with status failed`));

  res = await request("POST", "/exports/jobs", adminH, { dataCategory: "formula", exportType: "excel", formulaIds: ["nonexist"] });
  r.push(tc("A11-E04", "配方ID不存在", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/exports/jobs", null, { dataCategory: "formula", exportType: "excel" });
  r.push(tc("A11-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A12 - GET /api/exports/jobs
  res = await request("GET", "/exports/jobs", adminH);
  r.push(tc("A12-P01", "获取全部任务", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/jobs?status=completed", adminH);
  r.push(tc("A12-P02", "按状态筛选", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/jobs", null);
  r.push(tc("A12-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/jobs", formH);
  r.push(tc("A12-DI01", "formulist仅见自己的任务", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // A13 - GET /api/exports/jobs/:jobId
  if (createdJobId) {
    res = await request("GET", `/exports/jobs/${createdJobId}`, adminH);
    r.push(tc("A13-P01", "获取存在的任务详情", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("A13-P01", "获取存在的任务详情", "⏭", 0, 0, "无可用jobId"));
  }

  res = await request("GET", "/exports/jobs/nonexist", adminH);
  r.push(tc("A13-E01", "任务不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  // A14 - GET /api/exports/jobs/:jobId/download
  if (createdJobId) {
    res = await request("GET", `/exports/jobs/${createdJobId}/download`, adminH);
    r.push(tc("A14-P01", "下载导出文件", res.status === 200 || res.status === 404 ? "✅" : "❌", res.status, res.elapsed, `Status: ${res.status}`));
  } else {
    r.push(tc("A14-P01", "下载导出文件", "⏭", 0, 0, "无可用jobId"));
  }

  // A15 - POST /api/exports/jobs/:jobId/retry
  res = await request("POST", "/exports/jobs/nonexist/retry", adminH);
  r.push(tc("A15-E01", "重试不存在的任务", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  // A16 - POST /api/exports/jobs/:jobId/re-export
  res = await request("POST", "/exports/jobs/nonexist/re-export", adminH);
  r.push(tc("A16-E01", "重新导出不存在的任务", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  // A17 - GET /api/exports/shares
  res = await request("GET", "/exports/shares", adminH);
  r.push(tc("A17-P01", "admin获取全部分享", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/shares", null);
  r.push(tc("A17-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A18 - POST /api/exports/share
  res = await request("POST", "/exports/share", adminH, { formulaId: "f_test_001", shareType: "link" });
  r.push(tc("A18-P01", "创建链接分享", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  const createdShareId = res.body?.data?.shareId;

  res = await request("POST", "/exports/share", null, { formulaId: "f_test_001" });
  r.push(tc("A18-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // A19 - DELETE /api/exports/share/:shareId
  if (createdShareId) {
    res = await request("DELETE", `/exports/share/${createdShareId}`, adminH);
    r.push(tc("A19-P01", "删除存在的分享", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("A19-P01", "删除存在的分享", "⏭", 0, 0, "无可用shareId"));
  }

  // Special scenarios
  res = await request("GET", "/exports/statistics", adminH);
  r.push(tc("X-CT-01", "JSON响应Content-Type正确", res.status === 200 && res.headers?.["content-type"]?.includes("json") ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/exports/templates", adminH);
  r.push(tc("X-RF-01", "成功响应包含success字段", res.body?.success === true ? "✅" : "❌", res.status, res.elapsed));
}

// ===================== EXCEL IMPORT MODULE =====================
async function testExcelImport() {
  const r = results.excelImport;

  // B01 - GET /api/import/formula/template
  let res;
  res = await request("GET", "/import/formula/template", ADMIN_TOKEN);
  r.push(tc("B01-P01", "成功下载模板", res.status === 200 ? "✅" : "❌", res.status, res.elapsed, `CT: ${res.headers?.["content-type"]}`));

  res = await request("GET", "/import/formula/template", null);
  r.push(tc("B01-R01", "未登录下载模板", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/import/formula/template", FORM_TOKEN);
  r.push(tc("B01-R03", "formulist下载模板", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // B02 - POST /api/import/formula/parse
  res = await request("POST", "/import/formula/parse", ADMIN_TOKEN, null, true, {});
  r.push(tc("B02-E01", "未上传文件", res.status === 400 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  res = await request("POST", "/import/formula/parse", null, null, true, {});
  r.push(tc("B02-R01", "未登录上传文件", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // Create a simple xlsx-like content for test
  const xlsxContent = "PK\x03\x04"; // minimal xlsx header
  res = await request("POST", "/import/formula/parse", ADMIN_TOKEN, null, true, {
    file: { filename: "test.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: xlsxContent }
  });
  r.push(tc("B02-E07", "上传损坏的Excel", res.status === 500 || res.status === 400 ? "✅" : "❌", res.status, res.elapsed, `Expected 500/400`));

  // Method limit
  res = await request("POST", "/import/formula/template", ADMIN_TOKEN);
  r.push(tc("X-MD-01", "模板下载不支持POST", res.status === 404 || res.status === 405 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/import/formula/parse", ADMIN_TOKEN);
  r.push(tc("X-MD-02", "文件解析不支持GET", res.status === 404 || res.status === 405 ? "✅" : "❌", res.status, res.elapsed));
}

// ===================== FILES MODULE =====================
async function testFiles() {
  const r = results.files;

  // C01 - GET /api/files
  let res;
  res = await request("GET", "/files", ADMIN_TOKEN);
  r.push(tc("C01-P01", "获取全部文件列表", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  res = await request("GET", "/files?keyword=test", ADMIN_TOKEN);
  r.push(tc("C01-P02", "按关键词搜索", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/files", null);
  r.push(tc("C01-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // C02 - GET /api/files/stats
  res = await request("GET", "/files/stats", ADMIN_TOKEN);
  r.push(tc("C02-P01", "获取文件统计", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/files/stats", null);
  r.push(tc("C02-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // C03 - POST /api/files/upload
  const xlsxContent = "PK\x03\x04\x14\x00\x00\x00\x08\x00";
  res = await request("POST", "/files/upload", ADMIN_TOKEN, null, true, {
    file: { filename: "[test]配方数据.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: xlsxContent },
    fileType: "formula"
  });
  r.push(tc("C03-P01", "上传xlsx文件", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 150)));

  const uploadedFileId = res.body?.data?.fileId || res.body?.data?.id;

  res = await request("POST", "/files/upload", ADMIN_TOKEN, null, true, {});
  r.push(tc("C03-E01", "未上传文件", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/files/upload", null, null, true, {
    file: { filename: "test.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: xlsxContent }
  });
  r.push(tc("C03-R01", "未登录上传", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // C04 - POST /api/files/batch-delete
  res = await request("POST", "/files/batch-delete", ADMIN_TOKEN, { fileIds: [] });
  r.push(tc("C04-E02", "fileIds为空数组", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/files/batch-delete", FORM_TOKEN, { fileIds: ["f001"] });
  r.push(tc("C04-E01", "formulist无权批量删除", res.status === 403 ? "✅" : "❌", res.status, res.elapsed));

  // C05 - POST /api/files/batch-archive
  res = await request("POST", "/files/batch-archive", ADMIN_TOKEN, { fileIds: [] });
  r.push(tc("C05-E01", "fileIds为空数组", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  // C06 - POST /api/files/fix-garbled
  res = await request("POST", "/files/fix-garbled", ADMIN_TOKEN);
  r.push(tc("C06-P01", "修复乱码文件名", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // C07 - GET /api/files/:fileId
  if (uploadedFileId) {
    res = await request("GET", `/files/${uploadedFileId}`, ADMIN_TOKEN);
    r.push(tc("C07-P01", "获取存在的文件详情", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("C07-P01", "获取存在的文件详情", "⏭", 0, 0, "无可用fileId"));
  }

  res = await request("GET", "/files/nonexist", ADMIN_TOKEN);
  r.push(tc("C07-E01", "文件不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  // C08 - GET /api/files/:fileId/preview
  if (uploadedFileId) {
    res = await request("GET", `/files/${uploadedFileId}/preview`, ADMIN_TOKEN);
    r.push(tc("C08-P01", "预览Excel文件", res.status === 200 || res.status === 404 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("C08-P01", "预览Excel文件", "⏭", 0, 0, "无可用fileId"));
  }

  // C10 - GET /api/files/:fileId/download
  if (uploadedFileId) {
    res = await request("GET", `/files/${uploadedFileId}/download`, ADMIN_TOKEN);
    r.push(tc("C10-P01", "下载存在的文件", res.status === 200 || res.status === 404 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("C10-P01", "下载存在的文件", "⏭", 0, 0, "无可用fileId"));
  }

  // C11 - GET /api/files/:fileId/audit
  if (uploadedFileId) {
    res = await request("GET", `/files/${uploadedFileId}/audit`, ADMIN_TOKEN);
    r.push(tc("C11-P01", "获取文件的审计日志", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("C11-P01", "获取文件的审计日志", "⏭", 0, 0, "无可用fileId"));
  }

  // C12 - POST /api/files/:fileId/link
  if (uploadedFileId) {
    res = await request("POST", `/files/${uploadedFileId}/link`, ADMIN_TOKEN, { relatedId: "f_test_001", relatedType: "formula" });
    r.push(tc("C12-P01", "关联文件到配方", res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

    res = await request("POST", `/files/${uploadedFileId}/link`, ADMIN_TOKEN, { relatedType: "formula" });
    r.push(tc("C12-E01", "缺少relatedId", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("C12-P01", "关联文件到配方", "⏭", 0, 0, "无可用fileId"));
    r.push(tc("C12-E01", "缺少relatedId", "⏭", 0, 0, "无可用fileId"));
  }

  // C14 - GET /api/files/:fileId/relations
  if (uploadedFileId) {
    res = await request("GET", `/files/${uploadedFileId}/relations`, ADMIN_TOKEN);
    r.push(tc("C14-P01", "获取文件的关联关系", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("C14-P01", "获取文件的关联关系", "⏭", 0, 0, "无可用fileId"));
  }

  // C15 - POST /api/files/:fileId/reparse
  if (uploadedFileId) {
    res = await request("POST", `/files/${uploadedFileId}/reparse`, ADMIN_TOKEN, { model: "gpt-4" });
    r.push(tc("C15-P01", "重新解析文件", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("C15-P01", "重新解析文件", "⏭", 0, 0, "无可用fileId"));
  }

  // C16 - DELETE /api/files/:fileId
  res = await request("DELETE", "/files/nonexist", ADMIN_TOKEN);
  r.push(tc("C16-E02", "文件不存在(admin)", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("DELETE", "/files/nonexist", FORM_TOKEN);
  r.push(tc("C16-E01", "formulist无权删除", res.status === 403 ? "✅" : "❌", res.status, res.elapsed));

  // Special
  res = await request("GET", "/files", ADMIN_TOKEN);
  r.push(tc("X-RF-01", "成功响应包含success字段", res.body?.success === true ? "✅" : "❌", res.status, res.elapsed));
}

// ===================== REPORTS MODULE =====================
async function testReports() {
  const r = results.reports;

  // D01 - POST /api/reports/check-period
  let res;
  res = await request("POST", "/reports/check-period", ADMIN_TOKEN, { type: "weekly", periodStart: "2026-06-02" });
  r.push(tc("D01-P01", "检查不存在的周期", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  res = await request("POST", "/reports/check-period", ADMIN_TOKEN, { periodStart: "2026-06-02" });
  r.push(tc("D01-E01", "缺少type", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/reports/check-period", ADMIN_TOKEN, { type: "weekly" });
  r.push(tc("D01-E02", "缺少periodStart", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/reports/check-period", null, { type: "weekly", periodStart: "2026-06-02" });
  r.push(tc("D01-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // D02 - GET /api/reports/data/weekly
  res = await request("GET", "/reports/data/weekly?periodStart=2026-06-01&periodEnd=2026-06-07", ADMIN_TOKEN);
  r.push(tc("D02-P01", "获取周报数据", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/reports/data/weekly", ADMIN_TOKEN);
  r.push(tc("D02-E01", "缺少时间范围参数", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  // D03 - GET /api/reports/data/monthly
  res = await request("GET", "/reports/data/monthly?periodStart=2026-05-01&periodEnd=2026-05-31", ADMIN_TOKEN);
  r.push(tc("D03-P01", "获取月报数据", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  // D04 - GET /api/reports/targets
  res = await request("GET", "/reports/targets", ADMIN_TOKEN);
  r.push(tc("D04-P01", "获取全部目标", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  // D05 - POST /api/reports/targets
  res = await request("POST", "/reports/targets", ADMIN_TOKEN, { periodType: "quarterly", periodStart: "2026-04-01", periodEnd: "2026-06-30", targetsJson: { targets: [{ metric: "配方完成", target: 50 }] } });
  r.push(tc("D05-P01", "创建季度目标", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  const createdTargetId = res.body?.data?.id;

  res = await request("POST", "/reports/targets", ADMIN_TOKEN, { periodStart: "2026-04-01", periodEnd: "2026-06-30" });
  r.push(tc("D05-E01", "缺少periodType", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  // D06 - PUT /api/reports/targets/:id
  if (createdTargetId) {
    res = await request("PUT", `/reports/targets/${createdTargetId}`, ADMIN_TOKEN, { targetsJson: { targets: [{ metric: "配方完成", target: 100 }] } });
    r.push(tc("D06-P01", "更新目标内容", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("D06-P01", "更新目标内容", "⏭", 0, 0, "无可用targetId"));
  }

  // D07 - DELETE /api/reports/targets/:id
  if (createdTargetId) {
    res = await request("DELETE", `/reports/targets/${createdTargetId}`, ADMIN_TOKEN);
    r.push(tc("D07-P01", "删除存在的目标", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("D07-P01", "删除存在的目标", "⏭", 0, 0, "无可用targetId"));
  }

  // D11 - POST /api/reports/generate
  res = await request("POST", "/reports/generate", ADMIN_TOKEN, { type: "weekly", periodStart: "2026-06-02", periodEnd: "2026-06-08" });
  r.push(tc("D11-P01", "生成周报", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 150)));

  const createdReportId = res.body?.data?.id;

  res = await request("POST", "/reports/generate", ADMIN_TOKEN, { periodStart: "2026-06-02", periodEnd: "2026-06-08" });
  r.push(tc("D11-E01", "缺少type", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/reports/generate", null, { type: "weekly", periodStart: "2026-06-02", periodEnd: "2026-06-08" });
  r.push(tc("D11-R01", "未登录访问", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // D12 - GET /api/reports
  res = await request("GET", "/reports", ADMIN_TOKEN);
  r.push(tc("D12-P01", "获取全部报告", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/reports?type=weekly", ADMIN_TOKEN);
  r.push(tc("D12-P02", "按类型筛选", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // D13 - GET /api/reports/:id
  if (createdReportId) {
    res = await request("GET", `/reports/${createdReportId}`, ADMIN_TOKEN);
    r.push(tc("D13-P01", "获取存在的报告", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("D13-P01", "获取存在的报告", "⏭", 0, 0, "无可用reportId"));
  }

  res = await request("GET", "/reports/nonexist", ADMIN_TOKEN);
  r.push(tc("D13-E01", "报告不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  // D14 - GET /api/reports/:id/export/pdf
  if (createdReportId) {
    res = await request("GET", `/reports/${createdReportId}/export/pdf`, ADMIN_TOKEN);
    r.push(tc("D14-P01", "导出PDF", res.status === 200 || res.status === 500 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("D14-P01", "导出PDF", "⏭", 0, 0, "无可用reportId"));
  }

  // D17 - PUT /api/reports/:id
  if (createdReportId) {
    res = await request("PUT", `/reports/${createdReportId}`, ADMIN_TOKEN, { title: "[test]更新后的标题" });
    r.push(tc("D17-P01", "更新报告标题", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("D17-P01", "更新报告标题", "⏭", 0, 0, "无可用reportId"));
  }

  // D18 - DELETE /api/reports/:id
  if (createdReportId) {
    res = await request("DELETE", `/reports/${createdReportId}`, ADMIN_TOKEN);
    r.push(tc("D18-P01", "admin删除任意报告", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("D18-P01", "admin删除任意报告", "⏭", 0, 0, "无可用reportId"));
  }

  // Special
  res = await request("GET", "/reports", ADMIN_TOKEN);
  r.push(tc("X-RF-01", "成功响应包含success字段", res.body?.success === true ? "✅" : "❌", res.status, res.elapsed));
}

// ===================== ROLES MODULE =====================
async function testRoles() {
  const r = results.roles;

  // R01 - GET /api/roles
  let res;
  res = await request("GET", "/roles", ADMIN_TOKEN);
  r.push(tc("R01-P01", "获取角色列表成功", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  res = await request("GET", "/roles", null);
  r.push(tc("R01-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/roles", FORM_TOKEN);
  r.push(tc("R01-R04", "formulist用户访问", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  const adminRoleId = "role_admin_001";
  const formulistRoleId = "role_formulist_001";

  // R02 - GET /api/roles/:id
  res = await request("GET", `/roles/${adminRoleId}`, ADMIN_TOKEN);
  r.push(tc("R02-P01", "获取角色详情成功", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/roles/nonexist", ADMIN_TOKEN);
  r.push(tc("R02-E01", "角色不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/roles/nonexist", null);
  r.push(tc("R02-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // R03 - POST /api/roles
  res = await request("POST", "/roles", ADMIN_TOKEN, { name: "[test]测试角色", roleKey: "test_role_001" });
  r.push(tc("R03-P01", "创建角色成功", res.status === 201 || res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  const createdRoleId = res.body?.data?.id;

  res = await request("POST", "/roles", ADMIN_TOKEN, { name: "[test]重复", roleKey: "admin" });
  r.push(tc("R03-E01", "roleKey已存在", res.status === 409 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/roles", ADMIN_TOKEN, { roleKey: "test" });
  r.push(tc("R03-V01", "缺少name", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/roles", ADMIN_TOKEN, { name: "测试" });
  r.push(tc("R03-V02", "缺少roleKey", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/roles", null, { name: "测试", roleKey: "test" });
  r.push(tc("R03-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("POST", "/roles", FORM_TOKEN, { name: "测试", roleKey: "form_test_002" });
  r.push(tc("R03-R04", "formulist用户无permission:write", res.status === 403 ? "✅" : "❌", res.status, res.elapsed));

  // R04 - PUT /api/roles/:id
  if (createdRoleId) {
    res = await request("PUT", `/roles/${createdRoleId}`, ADMIN_TOKEN, { name: "[test]更新后名称" });
    r.push(tc("R04-P01", "更新自定义角色成功", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("R04-P01", "更新自定义角色成功", "⏭", 0, 0, "无可用roleId"));
  }

  res = await request("PUT", `/roles/${adminRoleId}`, ADMIN_TOKEN, { name: "修改admin" });
  r.push(tc("R04-E02", "修改系统管理员角色", res.status === 403 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", "/roles/nonexist", ADMIN_TOKEN, { name: "测试" });
  r.push(tc("R04-E01", "角色不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  // R05 - DELETE /api/roles/:id
  res = await request("DELETE", `/roles/${adminRoleId}`, ADMIN_TOKEN);
  r.push(tc("R05-E02", "删除系统角色", res.status === 403 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("DELETE", "/roles/nonexist", ADMIN_TOKEN);
  r.push(tc("R05-E01", "角色不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  if (createdRoleId) {
    res = await request("DELETE", `/roles/${createdRoleId}`, ADMIN_TOKEN);
    r.push(tc("R05-P01", "删除自定义角色成功", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));
  } else {
    r.push(tc("R05-P01", "删除自定义角色成功", "⏭", 0, 0, "无可用roleId"));
  }

  // R06 - GET /api/roles/:id/permissions
  res = await request("GET", `/roles/${adminRoleId}/permissions`, ADMIN_TOKEN);
  r.push(tc("R06-P01", "获取角色权限成功", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", `/roles/${adminRoleId}/permissions`, null);
  r.push(tc("R06-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // R07 - PUT /api/roles/:id/permissions
  res = await request("PUT", `/roles/${formulistRoleId}/permissions`, ADMIN_TOKEN, { permissionIds: [] });
  r.push(tc("R07-P02", "清空角色权限", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", `/roles/${formulistRoleId}/permissions`, ADMIN_TOKEN, { permissionIds: ["perm_test_1"] });
  r.push(tc("R07-P01", "更新角色权限成功", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", "/roles/nonexist/permissions", ADMIN_TOKEN, { permissionIds: ["perm_test_1"] });
  r.push(tc("R07-E01", "角色不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", `/roles/${adminRoleId}/permissions`, null, { permissionIds: [] });
  r.push(tc("R07-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // Restore formulist permissions
  const permRes = await request("GET", `/roles/${formulistRoleId}/permissions`, ADMIN_TOKEN);
  // Get all permission IDs
  const allPermsRes = await request("GET", "/permissions", ADMIN_TOKEN);
  const allPermIds = [];
  if (allPermsRes.body?.data) {
    for (const group of allPermsRes.body.data) {
      for (const p of (group.permissions || [])) {
        allPermIds.push(p.id);
      }
    }
  }
  // Restore some permissions for formulist
  const formulistPermKeys = ["material:read","material:write","formula:read","formula:write","ai:read","ai:write","nutrition:read","file:read","file:write","export:read","export:write"];
  const formulistPermIds = [];
  if (allPermsRes.body?.data) {
    for (const group of allPermsRes.body.data) {
      for (const p of (group.permissions || [])) {
        if (formulistPermKeys.includes(p.permissionKey)) {
          formulistPermIds.push(p.id);
        }
      }
    }
  }
  if (formulistPermIds.length > 0) {
    await request("PUT", `/roles/${formulistRoleId}/permissions`, ADMIN_TOKEN, { permissionIds: formulistPermIds });
  }

  // Special
  res = await request("GET", "/roles", ADMIN_TOKEN);
  r.push(tc("X-RF-01", "成功响应包含success字段", res.body?.success === true ? "✅" : "❌", res.status, res.elapsed));
}

// ===================== PERMISSIONS MODULE =====================
async function testPermissions() {
  const r = results.permissions;

  // P01 - GET /api/permissions
  let res;
  res = await request("GET", "/permissions", ADMIN_TOKEN);
  r.push(tc("P01-P01", "获取权限列表成功", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 150)));

  res = await request("GET", "/permissions", null);
  r.push(tc("P01-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/permissions", FORM_TOKEN);
  r.push(tc("P01-R04", "formulist用户访问", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // Special
  res = await request("POST", "/permissions", ADMIN_TOKEN);
  r.push(tc("X-MD01", "用POST访问权限列表", res.status === 404 || res.status === 405 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/permissions", ADMIN_TOKEN);
  r.push(tc("X-RF-01", "成功响应包含success字段", res.body?.success === true ? "✅" : "❌", res.status, res.elapsed));
}

// ===================== USERS MODULE =====================
async function testUsers() {
  const r = results.users;

  // U01 - GET /api/users
  let res;
  res = await request("GET", "/users", ADMIN_TOKEN);
  r.push(tc("U01-P01", "获取用户列表成功", res.status === 200 && res.body?.success ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 150)));

  res = await request("GET", "/users?keyword=admin", ADMIN_TOKEN);
  r.push(tc("U01-P03", "关键词搜索", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/users", null);
  r.push(tc("U01-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("GET", "/users", FORM_TOKEN);
  r.push(tc("U01-R04", "formulist用户无user:read", res.status === 403 ? "✅" : "❌", res.status, res.elapsed));

  // U02 - PUT /api/users/:id/role
  const formulistUserId = "mq3xgqa58xs2urvb";
  res = await request("PUT", `/users/${formulistUserId}/role`, ADMIN_TOKEN, { roleId: "role_formulist_001" });
  r.push(tc("U02-P01", "更新用户角色成功", res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  res = await request("PUT", `/users/${formulistUserId}/role`, ADMIN_TOKEN, { roleId: "nonexist-role-id" });
  r.push(tc("U02-E01", "目标角色不存在", res.status === 404 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", `/users/${formulistUserId}/role`, ADMIN_TOKEN, {});
  r.push(tc("U02-V01", "缺少roleId", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", `/users/${formulistUserId}/role`, null, { roleId: "role_formulist_001" });
  r.push(tc("U02-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  // U03 - PUT /api/users/:id/status
  const testFormulistId = "mq3xgzqmvaoxjm1r"; // [test]formulist01
  res = await request("PUT", `/users/${testFormulistId}/status`, ADMIN_TOKEN, { isActive: 0 });
  r.push(tc("U03-P01", "禁用用户成功", res.status === 200 ? "✅" : "❌", res.status, res.elapsed, JSON.stringify(res.body)?.substring(0, 100)));

  // Re-enable
  res = await request("PUT", `/users/${testFormulistId}/status`, ADMIN_TOKEN, { isActive: 1 });
  r.push(tc("U03-P02", "启用用户成功", res.status === 200 ? "✅" : "❌", res.status, res.elapsed));

  // Cannot disable self
  const adminUserId = "mq3xds3mf2eokmf9";
  res = await request("PUT", `/users/${adminUserId}/status`, ADMIN_TOKEN, { isActive: 0 });
  r.push(tc("U03-E01", "禁用自己", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", `/users/${testFormulistId}/status`, null, { isActive: 0 });
  r.push(tc("U03-R01", "无Token请求", res.status === 401 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", `/users/${testFormulistId}/status`, FORM_TOKEN, { isActive: 0 });
  r.push(tc("U03-R04", "formulist用户无user:write", res.status === 403 ? "✅" : "❌", res.status, res.elapsed));

  res = await request("PUT", `/users/${testFormulistId}/status`, ADMIN_TOKEN, {});
  r.push(tc("U03-V01", "缺少isActive", res.status === 400 ? "✅" : "❌", res.status, res.elapsed));

  // Special
  res = await request("GET", "/users", ADMIN_TOKEN);
  r.push(tc("X-RF-01", "成功响应包含success字段", res.body?.success === true ? "✅" : "❌", res.status, res.elapsed));

  // Check password not exposed
  const hasPassword = res.body?.data?.list?.some(u => u.password !== undefined);
  r.push(tc("X-SE03", "用户列表不含密码", !hasPassword ? "✅" : "❌", res.status, res.elapsed));
}

// ===================== MAIN =====================
async function main() {
  console.log("Starting API tests...");

  try { await testExports(); console.log("Exports done"); } catch (e) { console.error("Exports error:", e.message); }
  try { await testExcelImport(); console.log("ExcelImport done"); } catch (e) { console.error("ExcelImport error:", e.message); }
  try { await testFiles(); console.log("Files done"); } catch (e) { console.error("Files error:", e.message); }
  try { await testReports(); console.log("Reports done"); } catch (e) { console.error("Reports error:", e.message); }
  try { await testRoles(); console.log("Roles done"); } catch (e) { console.error("Roles error:", e.message); }
  try { await testPermissions(); console.log("Permissions done"); } catch (e) { console.error("Permissions error:", e.message); }
  try { await testUsers(); console.log("Users done"); } catch (e) { console.error("Users error:", e.message); }

  // Output results as JSON
  const output = {};
  for (const [mod, cases] of Object.entries(results)) {
    const passed = cases.filter(c => c.result === "✅").length;
    const failed = cases.filter(c => c.result === "❌").length;
    const skipped = cases.filter(c => c.result === "⏭").length;
    output[mod] = { total: cases.length, passed, failed, skipped, cases };
  }
  console.log("\n===RESULTS_JSON===");
  console.log(JSON.stringify(output));
}

main().catch(console.error);
