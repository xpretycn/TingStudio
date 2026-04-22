/**
 * 模拟数据生成工具
 * 用于生成逼真的测试数据
 */

// 中文姓氏
const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周',
  '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗'
]

// 中文名字用字
const GIVEN_NAMES = [
  '伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋',
  '勇', '艳', '杰', '娟', '涛', '明', '超', '秀', '霞', '平',
  '刚', '桂', '英', '华', '文', '建国', '建军', '玉兰', '秀英', '志明'
]

// 城市列表
const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '重庆', '武汉', '西安',
  '苏州', '天津', '青岛', '大连', '宁波', '厦门', '长沙', '郑州', '沈阳', '哈尔滨'
]

// 原料名称前缀
const MATERIAL_PREFIXES = [
  '天然', '有机', '精选', '进口', '特级', '精制', '纯天然', '优质', '新鲜', '高山',
  '深海', '野生', '传统', '秘制', '手工', '农家', '生态', '绿色', '健康', '营养'
]

// 原料名称后缀
const MATERIAL_SUFFIXES = [
  '粉', '油', '提取物', '浓缩液', '原浆', '精华', '膏', '液', '素', '胶',
  '粉剂', '颗粒', '片', '丸', '液剂', '精油', '原液', '精华素', '提取粉', '浓缩粉'
]

// 配方类型
const FORMULA_TYPES = [
  '保湿型', '滋养型', '修复型', '美白型', '抗皱型', '清爽型', '控油型', '舒缓型', '紧致型', '亮肤型'
]

/**
 * 随机整数生成器
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 随机数组元素
 */
export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * 随机打乱数组
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 随机选取多个元素（不重复）
 */
export function randomPickMultiple<T>(array: T[], count: number): T[] {
  return shuffle(array).slice(0, Math.min(count, array.length))
}

/**
 * 生成随机中文姓名
 */
export function generateChineseName(): string {
  const surname = randomPick(SURNAMES)
  const givenName = randomPick(GIVEN_NAMES)
  // 30%概率生成双字名
  const shouldAddExtra = Math.random() < 0.3
  const extra = shouldAddExtra ? randomPick(GIVEN_NAMES) : ''
  return surname + givenName + extra
}

/**
 * 生成随机手机号
 */
export function generatePhone(): string {
  const prefixes = ['138', '139', '150', '151', '152', '186', '187', '188', '189', '136', '137']
  const prefix = randomPick(prefixes)
  const suffix = Math.random().toString().substr(2, 8)
  return prefix + suffix
}

/**
 * 生成随机邮箱
 */
export function generateEmail(name: string): string {
  const domains = ['qq.com', '163.com', 'gmail.com', '126.com', 'sina.com']
  const domain = randomPick(domains)
  const username = name.toLowerCase().replace(/\s+/g, '') + randomInt(100, 999)
  return `${username}@${domain}`
}

/**
 * 生成随机地址
 */
export function generateAddress(): string {
  const city = randomPick(CITIES)
  const districts = ['朝阳区', '海淀区', '浦东新区', '天河区', '西湖区', '武侯区', '渝中区']
  const district = randomPick(districts)
  const streets = ['中山路', '人民路', '解放路', '建设路', '新华路', '文化路', '和平路']
  const street = randomPick(streets)
  const number = randomInt(1, 999)
  return `${city}${district}${street}${number}号`
}

/**
 * 生成随机用户名
 */
export function generateUsername(index: number): string {
  return `user${String(index + 1).padStart(3, '0')}`
}

/**
 * 生成随机原料编码
 */
export function generateMaterialCode(userId: string, index: number): string {
  return `MTL${userId.substr(-3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`
}

/**
 * 生成随机原料名称
 */
export function generateMaterialName(): string {
  const prefix = randomPick(MATERIAL_PREFIXES)
  const suffix = randomPick(MATERIAL_SUFFIXES)
  const base = ['玫瑰', '薰衣草', '绿茶', '人参', '燕窝', '珍珠', '胶原蛋白', '维生素', '蜂蜜', '芦荟']
  const material = randomPick(base)
  return `${prefix}${material}${suffix}`
}

/**
 * 生成随机配方名称
 */
export function generateFormulaName(): string {
  const type = randomPick(FORMULA_TYPES)
  const names = ['精华', '乳液', '面霜', '面膜', '爽肤水', '精华露', '护理液', '滋养霜']
  const name = randomPick(names)
  const version = randomInt(1, 5)
  return `${type}${name}V${version}`
}

/**
 * 生成随机配方描述
 */
export function generateDescription(): string {
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

/**
 * 生成随机库存数量
 */
export function generateStock(): number {
  // 70%概率生成小数量(1-100)，30%概率生成大数量(100-1000)
  return Math.random() < 0.7 ? randomInt(10, 100) : randomInt(100, 500)
}

/**
 * 生成随机原料使用量
 */
export function generateQuantity(): number {
  return randomInt(1, 50)
}
