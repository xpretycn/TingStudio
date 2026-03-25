/**
 * TingStudio 示例数据初始化脚本
 * 在Node.js环境中运行，模拟LocalStorage并初始化示例数据
 *
 * 使用方法:
 * npm run init:sample-data
 */

// 模拟LocalStorage API
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] || null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }

  // 用于调试的方法
  getAllKeys(): string[] {
    return Object.keys(this.store)
  }

  getLength(): number {
    return Object.keys(this.store).length
  }
}

// 创建全局localStorage实例
const localStorageInstance = new LocalStorageMock()
;(global as any).localStorage = localStorageInstance

// 模拟全局Date对象（如果需要特殊的时间戳处理）
;(global as any).Date = Date

/**
 * 生成随机ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 生成时间戳
 */
function getTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ==================== 模拟数据生成函数 ====================

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗']
const GIVEN_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀', '霞', '平', '刚', '桂', '英', '华', '文', '建国', '建军', '玉兰', '秀英', '志明']
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '重庆', '武汉', '西安', '苏州', '天津', '青岛', '大连', '宁波', '厦门', '长沙', '郑州', '沈阳', '哈尔滨']
const UNITS = ['kg', 'g', 'ml', 'L', '个', '包', '瓶', '盒']
const MATERIAL_PREFIXES = ['天然', '有机', '精选', '进口', '特级', '精制', '纯天然', '优质', '新鲜', '高山', '深海', '野生', '传统', '秘制', '手工', '农家', '生态', '绿色', '健康', '营养']
const MATERIAL_SUFFIXES = ['粉', '油', '提取物', '浓缩液', '原浆', '精华', '膏', '液', '素', '胶', '粉剂', '颗粒', '片', '丸', '液剂', '精油', '原液', '精华素', '提取粉', '浓缩粉']
const FORMULA_TYPES = ['保湿型', '滋养型', '修复型', '美白型', '抗皱型', '清爽型', '控油型', '舒缓型', '紧致型', '亮肤型']

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function randomPickMultiple<T>(array: T[], count: number): T[] {
  return shuffle(array).slice(0, Math.min(count, array.length))
}

function generateChineseName(): string {
  const surname = randomPick(SURNAMES)
  const givenName = randomPick(GIVEN_NAMES)
  const shouldAddExtra = Math.random() < 0.3
  const extra = shouldAddExtra ? randomPick(GIVEN_NAMES) : ''
  return surname + givenName + extra
}

function generatePhone(): string {
  const prefixes = ['138', '139', '150', '151', '152', '186', '187', '188', '189', '136', '137']
  const prefix = randomPick(prefixes)
  const suffix = Math.random().toString().substr(2, 8)
  return prefix + suffix
}

function generateEmail(name: string): string {
  const domains = ['qq.com', '163.com', 'gmail.com', '126.com', 'sina.com']
  const domain = randomPick(domains)
  const username = name.toLowerCase().replace(/\s+/g, '') + randomInt(100, 999)
  return `${username}@${domain}`
}

function generateAddress(): string {
  const city = randomPick(CITIES)
  const districts = ['朝阳区', '海淀区', '浦东新区', '天河区', '西湖区', '武侯区', '渝中区']
  const district = randomPick(districts)
  const streets = ['中山路', '人民路', '解放路', '建设路', '新华路', '文化路', '和平路']
  const street = randomPick(streets)
  const number = randomInt(1, 999)
  return `${city}${district}${street}${number}号`
}

function generateUsername(index: number): string {
  return `user${String(index + 1).padStart(3, '0')}`
}

function generateMaterialCode(userId: string, index: number): string {
  return `MTL${userId.substr(-3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
}

function generateMaterialName(): string {
  const prefix = randomPick(MATERIAL_PREFIXES)
  const suffix = randomPick(MATERIAL_SUFFIXES)
  const base = ['玫瑰', '薰衣草', '绿茶', '人参', '燕窝', '珍珠', '胶原蛋白', '维生素', '蜂蜜', '芦荟']
  const material = randomPick(base)
  return `${prefix}${material}${suffix}`
}

function generateFormulaName(): string {
  const type = randomPick(FORMULA_TYPES)
  const names = ['精华', '乳液', '面霜', '面膜', '爽肤水', '精华露', '护理液', '滋养霜']
  const name = randomPick(names)
  const version = randomInt(1, 5)
  return `${type}${name}V${version}`
}

function generateDescription(): string {
  const descriptions = [
    '精心调配的独特配方，为肌肤带来深层滋养',
    '采用天然原料，温和无刺激，适合各种肤质',
    '经过多道工艺提炼，保留了原料的天然活性',
    '融合现代科技与传统智慧，打造卓越护肤体验',
    '专为敏感肌肤设计，温和呵护，修复屏障',
    '高效补水，锁住水分，让肌肤水润透亮',
    '提亮肤色，淡化瑕疵，重现肌肤光彩',
    '紧致肌肤，减少细纹，恢复年轻活力',
    '控油清爽，收缩毛孔，打造清爽洁净肌肤',
    '深层清洁，去除杂质，让肌肤自由呼吸'
  ]
  return randomPick(descriptions)
}

function generateStock(): number {
  return Math.random() < 0.7 ? randomInt(10, 100) : randomInt(100, 500)
}

function generateQuantity(): number {
  return randomInt(1, 50)
}

// ==================== 数据生成函数 ====================

const STORAGE_KEYS = {
  USERS: 'tingstudio_users',
  CURRENT_USER: 'tingstudio_current_user',
  CUSTOMERS: 'tingstudio_customers',
  MATERIALS: 'tingstudio_materials',
  FORMULAS: 'tingstudio_formulas'
}

interface User {
  id: string
  username: string
  createdAt: string
}

interface Customer {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  createdBy: string
  createdAt: string
}

interface Material {
  id: string
  name: string
  code: string
  unit: string
  stock: number
  createdBy: string
  createdAt: string
}

interface MaterialItem {
  materialId: string
  materialName: string
  quantity: number
}

interface Formula {
  id: string
  name: string
  customerId: string
  customerName: string
  materials: MaterialItem[]
  description?: string
  createdBy: string
  createdAt: string
}

function clearAllData(): void {
  (global as any).localStorage.removeItem(STORAGE_KEYS.USERS)
  (global as any).localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
  (global as any).localStorage.removeItem(STORAGE_KEYS.CUSTOMERS)
  (global as any).localStorage.removeItem(STORAGE_KEYS.MATERIALS)
  (global as any).localStorage.removeItem(STORAGE_KEYS.FORMULAS)
}

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

function generateMaterials(userId: string, count: number): Material[] {
  const materials: Material[] = []
  for (let i = 0; i < count; i++) {
    materials.push({
      id: generateId(),
      name: generateMaterialName(),
      code: generateMaterialCode(userId, i),
      unit: randomPick(UNITS),
      stock: generateStock(),
      createdBy: userId,
      createdAt: getTimestamp()
    })
  }
  return materials
}

function generateFormulas(
  userId: string,
  customers: Customer[],
  materials: Material[],
  count: number
): Formula[] {
  const formulas: Formula[] = []
  
  for (let i = 0; i < count; i++) {
    const selectedCustomers = randomPickMultiple(customers, randomPick([1, 2, 3]))
    const customer = selectedCustomers[0]
    
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

function validateData(users: User[], customers: Customer[], materials: Material[], formulas: Formula[]): boolean {
  console.log('\n验证数据完整性:')
  console.log(`- 用户: ${users.length} 条`)
  console.log(`- 客户: ${customers.length} 条`)
  console.log(`- 原料: ${materials.length} 条`)
  console.log(`- 配方: ${formulas.length} 条`)
  
  let invalidCount = 0
  
  formulas.forEach(formula => {
    const customerExists = customers.some(c => c.id === formula.customerId)
    if (!customerExists) {
      invalidCount++
      console.warn(`⚠ 配方 "${formula.name}" 引用了不存在的客户`)
    }
    
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

// ==================== 主函数 ====================

/**
 * 初始化示例数据
 * @param userCount 用户数量
 * @param customerPerUser 每个用户的客户数量
 * @param materialPerUser 每个用户的原料数量
 * @param formulaPerUser 每个用户的配方数量
 */
function initSampleData(
  userCount = 20,
  customerPerUser = 20,
  materialPerUser = 20,
  formulaPerUser = 20
): void {
  console.log('开始初始化示例数据...')
  console.log(`配置: ${userCount}个用户, 每个用户${customerPerUser}个客户、${materialPerUser}个原料、${formulaPerUser}个配方`)
  
  // 清除所有现有数据
  clearAllData()
  console.log('✓ 所有现有数据已清除')
  
  // 生成用户
  const users = generateUsers(userCount)
  (global as any).localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
  console.log(`✓ 已生成 ${users.length} 个用户`)
  
  // 为每个用户生成客户、原料和配方
  let totalCustomers = 0
  let totalMaterials = 0
  let totalFormulas = 0
  
  const allCustomers: Customer[] = []
  const allMaterials: Material[] = []
  const allFormulas: Formula[] = []
  
  users.forEach(user => {
    const customers = generateCustomers(user.id, customerPerUser)
    allCustomers.push(...customers)
    totalCustomers += customers.length
    
    const materials = generateMaterials(user.id, materialPerUser)
    allMaterials.push(...materials)
    totalMaterials += materials.length
    
    const formulas = generateFormulas(user.id, customers, materials, formulaPerUser)
    allFormulas.push(...formulas)
    totalFormulas += formulas.length
  })
  
  // 批量保存数据
  (global as any).localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(allCustomers))
  (global as any).localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(allMaterials))
  (global as any).localStorage.setItem(STORAGE_KEYS.FORMULAS, JSON.stringify(allFormulas))
  
  console.log(`✓ 已生成 ${totalCustomers} 个客户`)
  console.log(`✓ 已生成 ${totalMaterials} 个原料`)
  console.log(`✓ 已生成 ${totalFormulas} 个配方`)
  
  // 验证数据
  validateData(users, allCustomers, allMaterials, allFormulas)
  
  console.log('\n✓ 数据初始化完成！')
  console.log(`总计: ${users.length} 用户, ${totalCustomers} 客户, ${totalMaterials} 原料, ${totalFormulas} 配方`)
}

// 执行初始化
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                       import.meta.url === process.argv[1].replace(/\\/g, '/')

if (isMainModule) {
  initSampleData(20, 20, 20, 20)
}

export { initSampleData }
