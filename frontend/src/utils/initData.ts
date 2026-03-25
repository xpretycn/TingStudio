/**
 * 数据初始化工具
 * 用于在浏览器环境中初始化示例数据
 */

import {
  generateUsername,
  generateChineseName,
  generatePhone,
  generateEmail,
  generateAddress,
  generateMaterialCode,
  generateMaterialName,
  generateFormulaName,
  generateDescription,
  generateStock,
  generateQuantity,
  randomPick,
  randomPickMultiple,
  shuffle
} from './mockData'
import type { User, Customer, Material, Formula, MaterialItem } from '@/types'
import { getTimestamp } from './timeFormat'

const STORAGE_KEYS = {
  USERS: 'tingstudio_users',
  CURRENT_USER: 'tingstudio_current_user',
  CUSTOMERS: 'tingstudio_customers',
  MATERIALS: 'tingstudio_materials',
  FORMULAS: 'tingstudio_formulas'
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 清除所有现有数据
 */
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.USERS)
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
  localStorage.removeItem(STORAGE_KEYS.CUSTOMERS)
  localStorage.removeItem(STORAGE_KEYS.MATERIALS)
  localStorage.removeItem(STORAGE_KEYS.FORMULAS)
  console.log('✓ 所有现有数据已清除')
}

/**
 * 生成测试用户
 */
function generateUsers(count: number): User[] {
  const users: User[] = []
  for (let i = 0; i < count; i++) {
    users.push({
      id: generateId(),
      username: generateUsername(i),
      createdAt: getTimestamp()
    })
  }
  return users
}

/**
 * 为指定用户生成客户数据
 */
function generateCustomers(userId: string, count: number): Customer[] {
  const customers: Customer[] = []
  for (let i = 0; i < count; i++) {
    const name = generateChineseName()
    customers.push({
      id: generateId(),
      name,
      contact: name,
      phone: generatePhone(),
      email: generateEmail(name),
      address: generateAddress(),
      createdBy: userId,
      createdAt: getTimestamp()
    })
  }
  return customers
}

/**
 * 为指定用户生成原料数据
 */
function generateMaterials(userId: string, count: number): Material[] {
  const materials: Material[] = []
  const units = ['kg', 'g', 'ml', 'L', '个', '包', '瓶', '盒']
  for (let i = 0; i < count; i++) {
    materials.push({
      id: generateId(),
      name: generateMaterialName(),
      code: generateMaterialCode(userId, i),
      unit: randomPick(units),
      stock: generateStock(),
      createdBy: userId,
      createdAt: getTimestamp()
    })
  }
  return materials
}

/**
 * 为指定用户生成配方数据
 */
function generateFormulas(
  userId: string,
  customers: Customer[],
  materials: Material[],
  count: number
): Formula[] {
  const formulas: Formula[] = []
  
  for (let i = 0; i < count; i++) {
    // 随机选择1-3个客户
    const selectedCustomers = randomPickMultiple(customers, randomPick([1, 2, 3]))
    const customer = selectedCustomers[0]
    
    // 随机选择2-5个原料
    const selectedMaterials = randomPickMultiple(materials, randomPick([2, 3, 4, 5]))
    
    const materialItems: MaterialItem[] = selectedMaterials.map(material => ({
      materialId: material.id,
      materialName: material.name,
      quantity: generateQuantity()
    }))
    
    formulas.push({
      id: generateId(),
      name: generateFormulaName(),
      customerId: customer.id,
      customerName: customer.name,
      materials: materialItems,
      description: generateDescription(),
      createdBy: userId,
      createdAt: getTimestamp()
    })
  }
  
  return formulas
}

/**
 * 初始化示例数据
 * @param userCount 用户数量，默认20
 * @param customerPerUser 每个用户的客户数量，默认20
 * @param materialPerUser 每个用户的原料数量，默认20
 * @param formulaPerUser 每个用户的配方数量，默认20
 */
export function initSampleData(
  userCount = 20,
  customerPerUser = 20,
  materialPerUser = 20,
  formulaPerUser = 20
): void {
  console.log('开始初始化示例数据...')
  console.log(`配置: ${userCount}个用户, 每个用户${customerPerUser}个客户、${materialPerUser}个原料、${formulaPerUser}个配方`)
  
  // 清除所有现有数据
  clearAllData()
  
  // 生成用户
  const users = generateUsers(userCount)
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
  console.log(`✓ 已生成 ${users.length} 个用户`)
  
  // 为每个用户生成客户、原料和配方
  let totalCustomers = 0
  let totalMaterials = 0
  let totalFormulas = 0
  
  const allCustomers: Customer[] = []
  const allMaterials: Material[] = []
  const allFormulas: Formula[] = []
  
  users.forEach(user => {
    // 生成客户
    const customers = generateCustomers(user.id, customerPerUser)
    allCustomers.push(...customers)
    totalCustomers += customers.length
    
    // 生成原料
    const materials = generateMaterials(user.id, materialPerUser)
    allMaterials.push(...materials)
    totalMaterials += materials.length
    
    // 生成配方
    const formulas = generateFormulas(user.id, customers, materials, formulaPerUser)
    allFormulas.push(...formulas)
    totalFormulas += formulas.length
  })
  
  // 批量保存数据
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(allCustomers))
  localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(allMaterials))
  localStorage.setItem(STORAGE_KEYS.FORMULAS, JSON.stringify(allFormulas))
  
  console.log(`✓ 已生成 ${totalCustomers} 个客户`)
  console.log(`✓ 已生成 ${totalMaterials} 个原料`)
  console.log(`✓ 已生成 ${totalFormulas} 个配方`)
  console.log('')
  console.log('✓ 数据初始化完成！')
  console.log(`总计: ${users.length} 用户, ${totalCustomers} 客户, ${totalMaterials} 原料, ${totalFormulas} 配方`)
}

/**
 * 验证数据完整性
 */
export function validateData(): boolean {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
  const customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]')
  const materials = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIALS) || '[]')
  const formulas = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORMULAS) || '[]')
  
  console.log('验证数据完整性:')
  console.log(`- 用户: ${users.length} 条`)
  console.log(`- 客户: ${customers.length} 条`)
  console.log(`- 原料: ${materials.length} 条`)
  console.log(`- 配方: ${formulas.length} 条`)
  
  // 验证关联关系
  let invalidCount = 0
  
  formulas.forEach(formula => {
    // 检查客户是否存在
    const customerExists = customers.some(c => c.id === formula.customerId)
    if (!customerExists) {
      invalidCount++
      console.warn(`⚠ 配方 "${formula.name}" 引用了不存在的客户`)
    }
    
    // 检查原料是否存在
    formula.materials.forEach(materialItem => {
      const materialExists = materials.some(m => m.id === materialItem.materialId)
      if (!materialExists) {
        invalidCount++
        console.warn(`⚠ 配方 "${formula.name}" 引用了不存在的原料`)
      }
    })
  })
  
  if (invalidCount === 0) {
    console.log('✓ 所有数据关联关系正确')
    return true
  } else {
    console.warn(`⚠ 发现 ${invalidCount} 个无效的关联关系`)
    return false
  }
}

/**
 * 在浏览器控制台快速初始化数据的辅助函数
 */
(window as any).initTingStudioData = () => {
  initSampleData(20, 20, 20, 20)
}

/**
 * 自动初始化数据（仅在首次加载且数据为空时执行）
 */
export function autoInitData(): void {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]')
  const customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]')
  const materials = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIALS) || '[]')
  const formulas = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORMULAS) || '[]')

  // 如果数据为空，则自动初始化
  if (users.length === 0 && customers.length === 0 && materials.length === 0 && formulas.length === 0) {
    console.log('检测到数据为空，开始自动初始化示例数据...')
    initSampleData(1, 20, 20, 20) // 1个测试用户，每个模块20条数据
  }
}

/**
 * 在浏览器控制台验证数据的辅助函数
 */
(window as any).validateTingStudioData = () => {
  validateData()
}

/**
 * 在浏览器控制台清除所有数据的辅助函数
 */
(window as any).clearTingStudioData = () => {
  clearAllData()
}
