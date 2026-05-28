import http from 'http';

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2N6aG5jenI2NTVqYmZqIiwidXNlcklkIjoibW9jemhuY3pyNjU1amJmaiIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyIqIl0sImlhdCI6MTc3OTk3NzAzNSwiZXhwIjoxNzgwNTgxODM1fQ.k20LuwLYvi3M6gB-VgMhtTWFxceXJIJrSg8rHbzEKHw";

function req(path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: 'localhost', port: 3000, path, method,
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
    };
    const r = http.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 0, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode || 0, data: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const formulaFields = ['name','code','createdAt','salesmanName','salesmanPhone','customerName','remark','finishedWeight','herbList','supplementList','protein','fat','carbs','sodium','energy','cost','profitRate','suggestedPrice','version','updatedAt','createdBy'];
const materialFields = ['name','code','materialType','spec','unit','stockQuantity','supplierName','unitPrice','createdAt'];
const reportFields = ['periodRange','generatedAt','newFormulasCount','newMaterialsCount','exportCount','topFormulas','salesmanStats','dataCutoffTime','generatedBy'];

function makeConfig(fields: string[], type: string, orientation: string) {
  return JSON.stringify({
    selectedFields: fields,
    requiredFields: fields.filter(f => ['name','code','createdAt','periodRange','generatedAt'].includes(f)),
    exportFormat: type, orientation, pageSize: 'A4', fontSize: 12,
    includeHeader: true, includeFooter: true,
  });
}

async function main() {
  // 1. List templates
  const list = await req('/api/exports/templates?pageSize=100');
  console.log('Templates:', (list.data as any).data.list.map((t: any) => `${t.name} (${t.category}/${t.type}) ID:${t.templateId}`));
  
  // 2. Delete deprecated templates
  const templates = (list.data as any).data.list;
  const toDelete = templates.filter((t: any) => ['MES对接API模板', '质检报告打印模板'].includes(t.name));
  for (const t of toDelete) {
    const r = await req(`/api/exports/templates/${t.templateId}`, 'DELETE');
    console.log(`Deleted: ${t.name} -> ${r.status}`);
  }

  // 3. Update remaining templates (the ones that exist from backup)
  const toUpdate = templates.filter((t: any) => !['MES对接API模板', '质检报告打印模板'].includes(t.name));
  
  const configMap: Record<string, { fields: string[]; type: string; orientation: string; category: string; isDefault: boolean }> = {
    '标准配方PDF模板': { fields: formulaFields, type: 'pdf', orientation: 'portrait', category: 'formula', isDefault: true },
    '生产配方Excel模板': { fields: formulaFields, type: 'excel', orientation: 'landscape', category: 'formula', isDefault: true },
    '营养标签PDF模板': { fields: ['name','code','createdAt','protein','fat','carbs','sodium','energy','finishedWeight','herbList','supplementList'], type: 'pdf', orientation: 'portrait', category: 'formula', isDefault: false },
    '原料清单Excel模板': { fields: materialFields, type: 'excel', orientation: 'landscape', category: 'material', isDefault: true },
  };

  for (const t of toUpdate) {
    const cfg = configMap[t.name];
    if (!cfg) { console.log(`Skip: ${t.name}`); continue; }
    const r = await req(`/api/exports/templates/${t.templateId}`, 'PUT', {
      category: cfg.category,
      type: cfg.type,
      formatConfig: makeConfig(cfg.fields, cfg.type, cfg.orientation),
      isDefault: cfg.isDefault ? 1 : 0,
    });
    console.log(`Updated: ${t.name} -> ${r.status}`);
  }

  // 4. Create new report templates if not exist
  const existingNames = (await req('/api/exports/templates?pageSize=100')).data as any;
  const existingList = existingNames.data.list.map((t: any) => t.name);
  
  const newTemplates = [
    { name: '周报导出Excel模板', category: 'weekly-report', type: 'excel', isDefault: true, fields: reportFields, orientation: 'landscape' },
    { name: '月报导出Excel模板', category: 'monthly-report', type: 'excel', isDefault: true, fields: reportFields, orientation: 'landscape' },
  ];

  for (const nt of newTemplates) {
    if (existingList.includes(nt.name)) {
      console.log(`Skip create (exists): ${nt.name}`);
      continue;
    }
    const r = await req('/api/exports/templates', 'POST', {
      name: nt.name,
      description: `${nt.name}的默认配置`,
      category: nt.category,
      type: nt.type,
      formatConfig: makeConfig(nt.fields, nt.type, nt.orientation),
      isDefault: nt.isDefault ? 1 : 0,
    });
    console.log(`Created: ${nt.name} -> ${r.status}`);
  }

  // 5. Verify
  const verify = await req('/api/exports/templates?pageSize=100');
  console.log('\nFinal templates:');
  for (const t of (verify.data as any).data.list) {
    const cfg = typeof t.formatConfig === 'string' ? JSON.parse(t.formatConfig) : t.formatConfig;
    console.log(`  ${t.name} (${t.category}/${t.type}) fields:${cfg?.selectedFields?.length || 0}`);
  }
}

main().catch(console.error);