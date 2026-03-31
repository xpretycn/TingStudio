/**
 * 预置营养标准数据脚本
 * 
 * 根据中国居民膳食营养素参考摄入量（DRIs）和食品安全国家标准
 * 创建 6 类人群的预置营养标准
 */

import { query, connectDatabase } from '../config/database.js'
import { generateId, now } from '../utils/helpers.js'

// 初始化数据库
connectDatabase()

// 预置营养标准数据
const PRESET_PROFILES = [
  {
    name: 'GB 10765-2021 婴儿配方食品',
    description: '适用于 0-6 月龄婴儿的配方食品国家标准',
    category: 'infant',
    targetValues: {
      energy: 2550, // kJ/100kcal
      protein: 9.3, // g/100kcal
      fat: 20.4, // g/100kcal
      carbohydrate: 54, // g/100kcal
      sodium: 150, // mg/100kcal
    },
    toleranceRanges: [
      { field: 'energy', label: '能量', min: 2550, max: 2950, alertLevel: 'warning' },
      { field: 'protein', label: '蛋白质', min: 9.3, max: 14.0, alertLevel: 'warning' },
      { field: 'fat', label: '脂肪', min: 20.4, max: 36.0, alertLevel: 'warning' },
      { field: 'carbohydrate', label: '碳水化合物', min: 54, max: 72, alertLevel: 'warning' },
      { field: 'sodium', label: '钠', min: 80, max: 200, alertLevel: 'warning' },
    ],
    mandatoryFields: ['energy', 'protein', 'fat', 'carbohydrate'],
  },
  {
    name: 'GB 10767-2021 较大婴儿配方食品',
    description: '适用于 6-12 月龄较大婴儿的配方食品国家标准',
    category: 'child',
    targetValues: {
      energy: 2720,
      protein: 10.5,
      fat: 18.0,
      carbohydrate: 52,
      sodium: 200,
    },
    toleranceRanges: [
      { field: 'energy', label: '能量', min: 2720, max: 3100, alertLevel: 'warning' },
      { field: 'protein', label: '蛋白质', min: 10.5, max: 16.0, alertLevel: 'warning' },
      { field: 'fat', label: '脂肪', min: 18.0, max: 30.0, alertLevel: 'warning' },
      { field: 'carbohydrate', label: '碳水化合物', min: 52, max: 70, alertLevel: 'warning' },
      { field: 'sodium', label: '钠', min: 100, max: 300, alertLevel: 'warning' },
    ],
    mandatoryFields: ['energy', 'protein', 'fat', 'carbohydrate'],
  },
  {
    name: 'GB 28050-2011 成人营养标签',
    description: '预包装食品营养标签通则（成人适用）',
    category: 'adult',
    targetValues: {
      energy: 8400, // kJ/day
      protein: 60, // g/day
      fat: 60, // g/day
      carbohydrate: 300, // g/day
      sodium: 2000, // mg/day
    },
    toleranceRanges: [
      { field: 'energy', label: '能量', min: 6720, max: 10080, alertLevel: 'warning' },
      { field: 'protein', label: '蛋白质', min: 48, max: 90, alertLevel: 'warning' },
      { field: 'fat', label: '脂肪', min: 48, max: 72, alertLevel: 'warning' },
      { field: 'carbohydrate', label: '碳水化合物', min: 240, max: 360, alertLevel: 'warning' },
      { field: 'sodium', label: '钠', min: 1600, max: 2400, alertLevel: 'warning' },
    ],
    mandatoryFields: ['energy', 'protein', 'fat', 'carbohydrate', 'sodium'],
  },
  {
    name: '老年人营养标准',
    description: '中国居民膳食营养素参考摄入量（65 岁以上老年人）',
    category: 'elderly',
    targetValues: {
      energy: 7530,
      protein: 65,
      fat: 50,
      carbohydrate: 280,
      sodium: 1500,
    },
    toleranceRanges: [
      { field: 'energy', label: '能量', min: 6024, max: 9036, alertLevel: 'warning' },
      { field: 'protein', label: '蛋白质', min: 52, max: 98, alertLevel: 'warning' },
      { field: 'fat', label: '脂肪', min: 40, max: 60, alertLevel: 'warning' },
      { field: 'carbohydrate', label: '碳水化合物', min: 224, max: 336, alertLevel: 'warning' },
      { field: 'sodium', label: '钠', min: 1200, max: 1800, alertLevel: 'warning' },
    ],
    mandatoryFields: ['energy', 'protein', 'fat', 'carbohydrate'],
  },
  {
    name: '孕妇营养标准',
    description: '中国居民膳食营养素参考摄入量（孕中期/晚期）',
    category: 'pregnant',
    targetValues: {
      energy: 9620,
      protein: 80,
      fat: 65,
      carbohydrate: 350,
      sodium: 2000,
    },
    toleranceRanges: [
      { field: 'energy', label: '能量', min: 7696, max: 11544, alertLevel: 'warning' },
      { field: 'protein', label: '蛋白质', min: 64, max: 120, alertLevel: 'warning' },
      { field: 'fat', label: '脂肪', min: 52, max: 78, alertLevel: 'warning' },
      { field: 'carbohydrate', label: '碳水化合物', min: 280, max: 420, alertLevel: 'warning' },
      { field: 'sodium', label: '钠', min: 1600, max: 2400, alertLevel: 'warning' },
    ],
    mandatoryFields: ['energy', 'protein', 'fat', 'carbohydrate'],
  },
  {
    name: '特殊医学用途配方食品',
    description: 'GB 29922-2013 特殊医学用途配方食品通则',
    category: 'special',
    targetValues: {
      energy: 8400,
      protein: 60,
      fat: 60,
      carbohydrate: 300,
      sodium: 2000,
    },
    toleranceRanges: [
      { field: 'energy', label: '能量', min: 6720, max: 10080, alertLevel: 'warning' },
      { field: 'protein', label: '蛋白质', min: 48, max: 90, alertLevel: 'warning' },
      { field: 'fat', label: '脂肪', min: 48, max: 72, alertLevel: 'warning' },
      { field: 'carbohydrate', label: '碳水化合物', min: 240, max: 360, alertLevel: 'warning' },
      { field: 'sodium', label: '钠', min: 1600, max: 2400, alertLevel: 'warning' },
    ],
    mandatoryFields: ['energy', 'protein', 'fat', 'carbohydrate', 'sodium'],
  },
]

async function seedPresetProfiles() {
  console.log('开始导入预置营养标准...')
  
  let count = 0
  
  for (const profile of PRESET_PROFILES) {
    const id = generateId()
    
    try {
      await query(
        `INSERT INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, is_preset, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          id,
          profile.name,
          profile.description,
          profile.category,
          JSON.stringify(profile.targetValues),
          JSON.stringify(profile.toleranceRanges),
          JSON.stringify(profile.mandatoryFields),
          now(),
          now(),
        ]
      )
      
      console.log(`✓ 已导入：${profile.name}`)
      count++
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint failed')) {
        console.log(`⊘ 已存在：${profile.name}`)
      } else {
        console.error(`✗ 导入失败 ${profile.name}:`, error.message)
      }
    }
  }
  
  console.log(`\n预置营养标准导入完成！共导入 ${count} 条记录。`)
}

// 执行种子脚本
seedPresetProfiles()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('导入失败:', err)
    process.exit(1)
  })
