const Database = require('better-sqlite3');
const db = new Database('./data/tingstudio.db');

console.log('=== 当前表结构检查 ===');

// 检查 formulas 表
console.log('\nformulas 表字段:');
const formulasFields = db.prepare("PRAGMA table_info(formulas)").all();
formulasFields.forEach(field => {
  console.log(`  ${field.name} (${field.type}) ${field.dflt_value ? `DEFAULT ${field.dflt_value}` : ''}`);
});

// 检查 formula_versions 表
console.log('\nformula_versions 表字段:');
const versionsFields = db.prepare("PRAGMA table_info(formula_versions)").all();
versionsFields.forEach(field => {
  console.log(`  ${field.name} (${field.type}) ${field.dflt_value ? `DEFAULT ${field.dflt_value}` : ''}`);
});

// 检查 materials 表
console.log('\nmaterials 表字段:');
const materialsFields = db.prepare("PRAGMA table_info(materials)").all();
materialsFields.forEach(field => {
  console.log(`  ${field.name} (${field.type}) ${field.dflt_value ? `DEFAULT ${field.dflt_value}` : ''}`);
});

// 检查数据示例
console.log('\n=== 数据示例 ===');

const sampleFormulas = db.prepare("SELECT id, name, ratio_factor, supplement_ratio_factor FROM formulas LIMIT 3").all();
console.log('配方示例:');
sampleFormulas.forEach(f => {
  console.log(`  ${f.id}: ${f.name} (ratio_factor: ${f.ratio_factor}, supplement_ratio_factor: ${f.supplement_ratio_factor})`);
});

const sampleVersions = db.prepare("SELECT version_id, formula_id, ratio_factor, supplement_ratio_factor FROM formula_versions LIMIT 3").all();
console.log('版本示例:');
sampleVersions.forEach(v => {
  console.log(`  ${v.version_id}: formula ${v.formula_id} (ratio_factor: ${v.ratio_factor}, supplement_ratio_factor: ${v.supplement_ratio_factor})`);
});

db.close();
console.log('\n检查完成');