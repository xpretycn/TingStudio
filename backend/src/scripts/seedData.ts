// 种子数据 - SQLite 版本（每表30条）
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase, getDb, closeDatabase } from '../config/database.js'
import { generateId, now } from '../utils/helpers.js'

async function seedData() {
  console.log('开始插入种子数据...')
  await connectDatabase()
  const db = getDb()

  const insert = db.transaction(() => {
    // ═══════════════════════════════════════════════════════
    // 1. 用户表 users（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建用户 (30条) ---')
    const roles = ['admin', 'formulist', 'formulist', 'salesman', 'production']
    const stmtUser = db.prepare(
      'INSERT OR IGNORE INTO users (id, username, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const userIds: string[] = []
    for (let i = 1; i <= 30; i++) {
      const id = generateId()
      userIds.push(id)
      const username = i === 1 ? 'admin' : `user${String(i).padStart(3, '0')}`
      const role = i === 1 ? 'admin' : roles[i % roles.length]
      const pwd = i === 1 ? 'admin123' : `${username}`
      const hashedPassword = bcrypt.hashSync(pwd, 10)
      try {
        stmtUser.run(id, username, hashedPassword, role, now(), now())
        console.log(`✓ 用户: ${username} (${role})`)
      } catch {
        console.log(`  用户 ${username} 已存在，跳过`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 2. 原料表 materials（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建原料 (30条) ---')
    const materialsData = [
      { name: '白砂糖', code: 'MAT001', unit: 'g', stock: 50000 },
      { name: '全脂奶粉', code: 'MAT002', unit: 'g', stock: 20000 },
      { name: '可可粉', code: 'MAT003', unit: 'g', stock: 10000 },
      { name: '黄油', code: 'MAT004', unit: 'g', stock: 15000 },
      { name: '低筋面粉', code: 'MAT005', unit: 'g', stock: 30000 },
      { name: '鸡蛋', code: 'MAT006', unit: 'g', stock: 25000 },
      { name: '食用盐', code: 'MAT007', unit: 'g', stock: 5000 },
      { name: '香草精', code: 'MAT008', unit: 'ml', stock: 3000 },
      { name: '脱脂奶粉', code: 'MAT009', unit: 'g', stock: 18000 },
      { name: '乳清蛋白粉', code: 'MAT010', unit: 'g', stock: 12000 },
      { name: '麦芽糊精', code: 'MAT011', unit: 'g', stock: 22000 },
      { name: '葡萄糖浆', code: 'MAT012', unit: 'ml', stock: 35000 },
      { name: '棕榈油', code: 'MAT013', unit: 'g', stock: 28000 },
      { name: '大豆分离蛋白', code: 'MAT014', unit: 'g', stock: 16000 },
      { name: '碳酸钙', code: 'MAT015', unit: 'g', stock: 8000 },
      { name: '维生素C', code: 'MAT016', unit: 'g', stock: 4000 },
      { name: '维生素E', code: 'MAT017', unit: 'g', stock: 3500 },
      { name: '柠檬酸', code: 'MAT018', unit: 'g', stock: 6000 },
      { name: '卡拉胶', code: 'MAT019', unit: 'g', stock: 4500 },
      { name: '果胶', code: 'MAT020', unit: 'g', stock: 5500 },
      { name: '山梨酸钾', code: 'MAT021', unit: 'g', stock: 3000 },
      { name: 'DHA藻油', code: 'MAT022', unit: 'ml', stock: 2000 },
      { name: 'ARA花生四烯酸', code: 'MAT023', unit: 'ml', stock: 1800 },
      { name: '牛磺酸', code: 'MAT024', unit: 'g', stock: 5000 },
      { name: '叶黄素', code: 'MAT025', unit: 'g', stock: 1500 },
      { name: '低聚果糖', code: 'MAT026', unit: 'g', stock: 9000 },
      { name: '乳酸亚铁', code: 'MAT027', unit: 'g', stock: 3000 },
      { name: '葡萄糖酸锌', code: 'MAT028', unit: 'g', stock: 2500 },
      { name: '烟酰胺', code: 'MAT029', unit: 'g', stock: 2000 },
      { name: 'L-肉碱', code: 'MAT030', unit: 'g', stock: 1800 },
    ]
    const stmtMat = db.prepare(
      'INSERT OR IGNORE INTO materials (id, name, code, unit, stock, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const materialIds: string[] = []
    for (const mat of materialsData) {
      const id = generateId()
      materialIds.push(id)
      try {
        stmtMat.run(id, mat.name, mat.code, mat.unit, mat.stock, userIds[0], now(), now())
        console.log(`✓ 原料: ${mat.name}`)
      } catch {
        console.log(`  原料 ${mat.name} 已存在，跳过`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 3. 客户表 customers（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建客户 (30条) ---')
    const customersData = [
      { name: '甜蜜食品有限公司', contact: '张经理', phone: '13800138001', email: 'zhang@sweet.com', address: '上海市浦东新区食品路100号' },
      { name: '美味食品集团', contact: '李总', phone: '13900139002', email: 'li@tasty.com', address: '北京市朝阳区食街200号' },
      { name: '健康食品科技', contact: '王主任', phone: '13700137003', email: 'wang@health.com', address: '广州市天河区健康大道88号' },
      { name: '佳宝乳业', contact: '赵部长', phone: '13600136004', email: 'zhao@jiabao.com', address: '内蒙古呼和浩特市乳业园区' },
      { name: '金宝母婴用品', contact: '孙总监', phone: '13500135005', email: 'sun@jinbao.com', address: '深圳市南山区母婴大厦15层' },
      { name: '诺优营养科技', contact: '周博士', phone: '13400134006', email: 'zhou@nuoyou.com', address: '杭州市滨江区科技路66号' },
      { name: '绿源食品加工厂', contact: '吴厂长', phone: '13300133007', email: 'wu@lvyuan.com', address: '成都市武侯区绿源路22号' },
      { name: '盛世乳制品有限公司', contact: '郑副总', phone: '13200132008', email: 'zheng@shengshi.com', address: '哈尔滨市松北区乳业大街' },
      { name: '婴乐食品贸易', contact: '冯经理', phone: '13100131009', email: 'feng@yingle.com', address: '武汉市江汉区贸易中心' },
      { name: '天然坊食品有限公司', contact: '陈总', phone: '13000130010', email: 'chen@tianran.com', address: '南京市鼓楼区天然路99号' },
      { name: '星河营养品有限公司', contact: '褚主管', phone: '15000150011', email: 'chu@xinghe.com', address: '重庆市渝北区星河路5号' },
      { name: '康宝母婴连锁', contact: '卫经理', phone: '15100151012', email: 'wei@kangbao.com', address: '西安市雁塔区康宝街18号' },
      { name: '鲜奶工坊', contact: '蒋店长', phone: '15200152013', email: 'jiang@xiannai.com', address: '长沙市芙蓉区鲜奶巷20号' },
      { name: '润之味食品', contact: '沈总监', phone: '15300153014', email: 'shen@runzhi.com', address: '苏州市工业园区润之路33号' },
      { name: '禾优生物科技', contact: '韩博士', phone: '15400154015', email: 'han@heyou.com', address: '合肥市高新区禾优大厦' },
      { name: '优选乳业集团', contact: '杨副董', phone: '15500155016', email: 'yang@youxuan.com', address: '石家庄市裕华区优选路1号' },
      { name: '乐享食品科技', contact: '朱经理', phone: '15600156017', email: 'zhu@lexiang.com', address: '福州市鼓楼区乐享大厦8层' },
      { name: '皇家宝贝母婴', contact: '秦总', phone: '15700157018', email: 'qin@huangjia.com', address: '青岛市市南区皇家街100号' },
      { name: '维康营养食品', contact: '许主任', phone: '15800158019', email: 'xu@weikang.com', address: '天津市南开区维康路50号' },
      { name: '百味食品配料', contact: '何经理', phone: '15900159020', email: 'he@baiwei.com', address: '郑州市金水区百味巷8号' },
      { name: '安贝婴幼儿食品', contact: '吕总监', phone: '18000180021', email: 'lv@anbei.com', address: '昆明市盘龙区安贝路12号' },
      { name: '优加乳品', contact: '施经理', phone: '18100181022', email: 'shi@youjia.com', address: '沈阳市沈河区优加大厦' },
      { name: '德尚食品研发', contact: '张博士', phone: '18200182023', email: 'zhangb@deshang.com', address: '济南市历下区德尚科技园' },
      { name: '味全食品工业', contact: '王副总', phone: '18300183024', email: 'wangb@weiquan.com', address: '宁波市鄞州区味全工业园' },
      { name: '嘉宝食品集团', contact: '刘总监', phone: '18400184025', email: 'liub@jiabao.com', address: '大连市中山区嘉宝大厦' },
      { name: '贝因美食品', contact: '谢经理', phone: '18500185026', email: 'xie@beingmate.com', address: '杭州市滨江区贝因美路1号' },
      { name: '飞鹤乳业合作方', contact: '高经理', phone: '18600186027', email: 'gao@feihe.com', address: '齐齐哈尔市飞鹤产业园' },
      { name: '雅士利食品', contact: '马总监', phone: '18700187028', email: 'ma@yashili.com', address: '广州市开发区雅士利大厦' },
      { name: '明一国际', contact: '林经理', phone: '18800188029', email: 'lin@mingyi.com', address: '福州市仓山区明一工业园' },
      { name: '合生元生物', contact: '罗总', phone: '18900189030', email: 'luo@biostime.com', address: '广州市黄埔区生物科技园' },
    ]
    const stmtCus = db.prepare(
      'INSERT OR IGNORE INTO customers (id, name, contact, phone, email, address, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const customerIds: string[] = []
    for (const cus of customersData) {
      const id = generateId()
      customerIds.push(id)
      try {
        stmtCus.run(id, cus.name, cus.contact, cus.phone, cus.email, cus.address, userIds[0], now(), now())
        console.log(`✓ 客户: ${cus.name}`)
      } catch {
        console.log(`  客户 ${cus.name} 已存在，跳过`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 4. 业务员表 salesmen（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建业务员 (30条) ---')
    const departments = ['华东销售部', '华南销售部', '华北销售部', '西南销售部', '华中销售部', '东北销售部']
    const salesmenData = Array.from({ length: 30 }, (_, i) => ({
      name: `业务员${String.fromCharCode(65 + Math.floor(i / 2))}${i % 2 === 0 ? '甲' : '乙'}`,
      code: `SM${String(i + 1).padStart(3, '0')}`,
      department: departments[i % departments.length],
      phone: `136${String(10000000 + i * 111111).padStart(8, '0')}`,
      email: `sm${String(i + 1).padStart(3, '0')}@ting.com`,
      status: i < 27 ? 'active' : 'inactive',
    }))
    const stmtSm = db.prepare(
      'INSERT OR IGNORE INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const salesmanIds: string[] = []
    for (const sm of salesmenData) {
      const id = generateId()
      salesmanIds.push(id)
      try {
        stmtSm.run(id, sm.name, sm.code, sm.department, sm.phone, sm.email, sm.status, userIds[0], now(), now())
        console.log(`✓ 业务员: ${sm.name}`)
      } catch {
        console.log(`  业务员 ${sm.name} 已存在，跳过`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 5. 配方表 formulas（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建配方 (30条) ---')
    const formulaNames = [
      '婴儿配方奶粉1段', '婴儿配方奶粉2段', '婴儿配方奶粉3段',
      '幼儿营养米粉', '儿童成长奶粉', '中老年高钙奶粉',
      '孕妇营养奶粉', '脱脂低脂奶粉', '全脂甜奶粉',
      '巧克力风味奶粉', '草莓风味奶粉', '原味酸奶发酵剂',
      '高蛋白运动奶粉', '低乳糖奶粉', '有机全脂奶粉',
      '羊奶粉配方', '益生菌配方奶粉', 'DHA强化配方奶粉',
      '高铁婴儿米粉', '维生素强化奶粉', '无糖代餐奶粉',
      '奶茶专用奶精', '烘焙专用奶粉', '冰淇淋专用奶粉',
      '保健功能奶粉', '学生营养奶粉', '速溶全脂奶粉',
      '浓缩蛋白配方', '膳食纤维奶粉', '特殊医学用途配方',
    ]
    const stmtFormula = db.prepare(
      'INSERT OR IGNORE INTO formulas (id, name, customer_id, customer_name, materials_json, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const formulaIds: string[] = []
    for (let i = 0; i < 30; i++) {
      const id = generateId()
      formulaIds.push(id)
      const cusIdx = i % customerIds.length
      // 为每个配方生成合理的原料组合
      const matCount = 4 + (i % 5)
      const usedMats = new Set<number>()
      const matsList: { materialId: string; name: string; amount: number; unit: string }[] = []
      for (let j = 0; j < matCount; j++) {
        let matIdx: number
        do {
          matIdx = Math.floor((i * 3 + j * 7) % 30)
        } while (usedMats.has(matIdx))
        usedMats.add(matIdx)
        matsList.push({
          materialId: materialIds[matIdx],
          materialName: materialsData[matIdx].name,
          quantity: Math.round((10 + (i * 13 + j * 37) % 490) * 10) / 10,
        })
      }
      const description = `${customersData[cusIdx].name}定制的${formulaNames[i]}，采用优质原料精制而成。`
      try {
        stmtFormula.run(
          id, formulaNames[i], customerIds[cusIdx], customersData[cusIdx].name,
          JSON.stringify(matsList), description, userIds[i % 5 + 1], now(), now()
        )
        console.log(`✓ 配方: ${formulaNames[i]}`)
      } catch (e) {
        console.log(`  配方 ${formulaNames[i]} 创建失败或已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 6. 配方版本表 formula_versions（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建配方版本 (30条) ---')
    const stmtFv = db.prepare(
      'INSERT OR IGNORE INTO formula_versions (version_id, formula_id, version_number, version_name, changes_json, snapshot_json, status, is_current, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const versionIds: string[] = []
    for (let i = 0; i < 30; i++) {
      const vid = generateId()
      versionIds.push(vid)
      const formulaIdx = i % formulaIds.length
      const verNum = `v${Math.floor(i / formulaIds.length) + 1}.${(i % 3) + 1}.0`
      const statuses = ['draft', 'published', 'archived'] as const
      const status = statuses[i % 3]
      const isCurrent = (i % 10 === 0) ? 1 : 0
      const changes = [
        { field: '白砂糖', oldVal: '200g', newVal: `${180 + i % 40}g` },
        { field: '全脂奶粉', oldVal: '300g', newVal: `${280 + i % 60}g` },
      ]
      const snapshot = { name: formulaNames[formulaIdx], timestamp: now(), data: `配方快照 ${verNum}` }
      try {
        stmtFv.run(
          vid, formulaIds[formulaIdx], verNum,
          `${formulaNames[formulaIdx]} ${verNum}`,
          JSON.stringify(changes), JSON.stringify(snapshot),
          status, isCurrent, userIds[(i + 2) % 10], now()
        )
        console.log(`✓ 版本: ${verNum} (${formulaNames[formulaIdx]})`)
      } catch (e) {
        console.log(`  版本 ${verNum} 创建失败或已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 7. 导出模板表 export_templates（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建导出模板 (30条) ---')
    const templateNames = [
      '标准配方PDF模板', '详细配方PDF模板', '简要配方PDF模板',
      '营养标签PDF模板', '客户定制PDF模板', '内部审核PDF模板',
      '生产配方Excel模板', '原料清单Excel模板', '营养成分Excel模板',
      '批量配方Excel模板', '成本核算Excel模板', '库存对比Excel模板',
      'MES对接API模板', 'ERP对接API模板', 'WMS对接API模板',
      '质检系统API模板', '采购系统API模板', '客户门户API模板',
      '生产指令打印模板', '原料领料单打印模板', '质检报告打印模板',
      '出货标签打印模板', '批次追溯打印模板', '配比称量打印模板',
      '婴儿配方PDF模板', '成人营养PDF模板', '运动营养PDF模板',
      '老年保健PDF模板', '孕妇营养PDF模板', '特殊医学PDF模板',
    ]
    const types = ['pdf', 'excel', 'api', 'print'] as const
    const stmtEt = db.prepare(
      'INSERT OR IGNORE INTO export_templates (template_id, name, description, type, format_config_json, is_default, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const templateIds: string[] = []
    for (let i = 0; i < 30; i++) {
      const tid = generateId()
      templateIds.push(tid)
      const type = types[i % 4]
      const isDefault = (i === 0) ? 1 : 0
      const config = {
        columns: ['配方名称', '客户名称', '原料列表', '创建时间'],
        orientation: i % 2 === 0 ? 'portrait' : 'landscape',
        fontSize: 12,
      }
      try {
        stmtEt.run(
          tid, templateNames[i], `${templateNames[i]}的描述信息`,
          type, JSON.stringify(config), isDefault, userIds[0], now()
        )
        console.log(`✓ 导出模板: ${templateNames[i]} (${type})`)
      } catch (e) {
        console.log(`  导出模板 ${templateNames[i]} 已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 8. 导出任务表 export_jobs（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建导出任务 (30条) ---')
    const jobStatuses = ['completed', 'completed', 'completed', 'failed', 'processing', 'pending'] as const
    const stmtEj = db.prepare(
      'INSERT OR IGNORE INTO export_jobs (job_id, formula_id, version_id, template_id, export_type, status, file_url, file_name, api_endpoint, progress, error_message, created_by, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < 30; i++) {
      const jid = generateId()
      const formulaIdx = i % formulaIds.length
      const status = jobStatuses[i % jobStatuses.length]
      const exportType = (types[i % 4] === 'print') ? 'pdf' : types[i % 4]
      const progress = status === 'completed' ? 100 : status === 'pending' ? 0 : Math.floor(Math.random() * 80) + 10
      const fileUrl = status === 'completed' ? `/exports/formula_${formulaIdx + 1}_${Date.now()}.pdf` : null
      const fileName = status === 'completed' ? `配方_${formulaNames[formulaIdx]}_${i + 1}.pdf` : null
      const errorMsg = status === 'failed' ? '导出过程中发生超时错误' : null
      const completedAt = status === 'completed' ? now() : null
      try {
        stmtEj.run(
          jid, formulaIds[formulaIdx],
          versionIds[i % versionIds.length],
          templateIds[i % templateIds.length],
          exportType, status, fileUrl, fileName,
          exportType === 'api' ? '/api/v1/formula/export' : null,
          progress, errorMsg,
          userIds[(i + 1) % 10], now(), completedAt
        )
        console.log(`✓ 导出任务: ${formulaNames[formulaIdx]} (${status})`)
      } catch (e) {
        console.log(`  导出任务创建失败: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 9. 营养标准表 nutrition_profiles（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建营养标准 (30条) ---')
    const categories = ['infant', 'child', 'adult', 'elderly', 'pregnant', 'special'] as const
    const profileNames = [
      '婴儿配方奶GB10765标准', '较大婴儿配方奶GB10767标准', '幼儿配方奶GB10769标准',
      '1-3岁幼儿营养标准', '4-6岁儿童营养标准', '7-10岁学龄儿童标准',
      '11-14岁青少年营养标准', '15-18岁青少年营养标准', '成人基础营养标准',
      '成人高强度运动标准', '成人减脂营养标准', '成人增肌营养标准',
      '老年男性营养标准', '老年女性营养标准', '老年骨质疏松预防标准',
      '孕早期营养标准', '孕中期营养标准', '孕晚期营养标准',
      '哺乳期营养标准', '乳糖不耐受特殊配方标准', '苯丙酮尿症特殊配方标准',
      '过敏体质特殊配方标准', '糖尿病专用营养标准', '高血压专用营养标准',
      '术后恢复营养标准', '胃肠道功能恢复标准', '免疫低下营养标准',
      '儿童青少年钙需求标准', '婴幼儿DHA推荐标准', '孕期叶酸需求标准',
    ]
    const stmtNp = db.prepare(
      'INSERT OR IGNORE INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < 30; i++) {
      const pid = generateId()
      const category = categories[i % categories.length]
      const targetValues = {
        energy_kj: 1500 + i * 50,
        protein_g: 10 + i * 2,
        fat_g: 20 + i,
        carbohydrate_g: 50 + i * 3,
        calcium_mg: 300 + i * 20,
        iron_mg: 5 + i * 0.5,
        zinc_mg: 3 + i * 0.3,
        vitaminA_ug: 200 + i * 30,
        vitaminD_ug: 5 + i,
        vitaminE_mg: 3 + i * 0.5,
      }
      const toleranceRanges = {
        energy_kj: { min: 0.9, max: 1.1 },
        protein_g: { min: 0.8, max: 1.2 },
        fat_g: { min: 0.85, max: 1.15 },
      }
      const mandatoryFields = ['energy_kj', 'protein_g', 'fat_g', 'calcium_mg']
      try {
        stmtNp.run(
          pid, profileNames[i], `${profileNames[i]}的详细描述`,
          category,
          JSON.stringify(targetValues),
          JSON.stringify(toleranceRanges),
          JSON.stringify(mandatoryFields),
          now(), now()
        )
        console.log(`✓ 营养标准: ${profileNames[i]}`)
      } catch (e) {
        console.log(`  营养标准 ${profileNames[i]} 已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 10. 原料营养成分表 material_nutrition（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建原料营养成分 (30条) ---')
    const stmtMn = db.prepare(
      'INSERT OR IGNORE INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < 30; i++) {
      const nid = generateId()
      const per100g = {
        energy_kj: 1500 + i * 100,
        protein_g: Math.round((5 + i * 2.5) * 10) / 10,
        fat_g: Math.round((1 + i * 1.5) * 10) / 10,
        carbohydrate_g: Math.round((70 + i * 3) * 10) / 10,
        dietary_fiber_g: Math.round((0.5 + i * 0.2) * 10) / 10,
        sodium_mg: Math.round((50 + i * 30) * 10) / 10,
        calcium_mg: Math.round((20 + i * 15) * 10) / 10,
        iron_mg: Math.round((0.5 + i * 0.3) * 10) / 10,
        vitaminC_mg: Math.round((0.1 + i * 0.05) * 10) / 10,
      }
      const sources = ['中国食物成分表2024版', 'USDA食物数据库', 'GB28050-2011', '企业检测数据', '第三方检测报告']
      try {
        stmtMn.run(
          nid, materialIds[i],
          JSON.stringify(per100g),
          '1.0',
          sources[i % sources.length],
          `原料[${materialsData[i].name}]营养成分数据`,
          now()
        )
        console.log(`✓ 原料营养: ${materialsData[i].name}`)
      } catch (e) {
        console.log(`  原料营养 ${materialsData[i].name} 已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 11. 业务员-客户关联表（30条，保证 UNIQUE 约束）
    // UNIQUE (salesman_id, customer_id, start_date)
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建业务员-客户关联 (30条) ---')
    const stmtScr = db.prepare(
      'INSERT OR IGNORE INTO salesman_customer_relations (id, salesman_id, customer_id, relation_type, start_date, end_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const usedPairs = new Set<string>()
    let scrCount = 0
    for (let i = 0; i < 50 && scrCount < 30; i++) {
      const smIdx = i % salesmanIds.length
      const cusIdx = (i * 3 + 7) % customerIds.length
      const month = (i % 12) + 1
      const startDate = `2024-${String(month).padStart(2, '0')}-01`
      const pairKey = `${smIdx}-${cusIdx}-${startDate}`
      if (usedPairs.has(pairKey)) continue
      usedPairs.add(pairKey)
      const rid = generateId()
      const relType = i % 3 === 0 ? 'secondary' : 'primary'
      const endDate = i % 5 === 0 ? null : '2025-12-31'
      try {
        stmtScr.run(
          rid, salesmanIds[smIdx], customerIds[cusIdx],
          relType, startDate, endDate,
          `${salesmenData[smIdx].name}负责${customersData[cusIdx].name}`,
          now()
        )
        console.log(`✓ 关联: ${salesmenData[smIdx].name} -> ${customersData[cusIdx].name}`)
        scrCount++
      } catch (e) {
        console.log(`  关联创建失败: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 12. 业务员-配方师对接表（20条，保证 UNIQUE 约束）
    // UNIQUE (salesman_id, formulist_id)
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建业务员-配方师对接 (20条) ---')
    const stmtSfr = db.prepare(
      'INSERT OR IGNORE INTO salesman_formulist_relations (id, salesman_id, formulist_id, cooperation_mode, priority, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const usedFlPairs = new Set<string>()
    let sfrCount = 0
    for (let i = 0; i < 50 && sfrCount < 20; i++) {
      const smIdx = i % salesmanIds.length
      const flIdx = (i * 3 + 1) % userIds.length
      const pairKey = `${smIdx}-${flIdx}`
      if (usedFlPairs.has(pairKey)) continue
      usedFlPairs.add(pairKey)
      const rid = generateId()
      const mode = i % 2 === 0 ? 'direct' : 'indirect'
      const priority = (i % 5) + 1
      try {
        stmtSfr.run(
          rid, salesmanIds[smIdx], userIds[flIdx],
          mode, priority,
          `${salesmenData[smIdx].name}与配方师${flIdx}对接合作`,
          now()
        )
        console.log(`✓ 对接: ${salesmenData[smIdx].name} <-> 配方师${flIdx}`)
        sfrCount++
      } catch (e) {
        console.log(`  对接创建失败: ${e}`)
      }
    }

    console.log('\n✅ 种子数据全部插入完成！')
    console.log(`  用户: 30 条`)
    console.log(`  原料: 30 条`)
    console.log(`  客户: 30 条`)
    console.log(`  业务员: 30 条`)
    console.log(`  配方: 30 条`)
    console.log(`  配方版本: 30 条`)
    console.log(`  导出模板: 30 条`)
    console.log(`  导出任务: 30 条`)
    console.log(`  营养标准: 30 条`)
    console.log(`  原料营养: 30 条`)
    console.log(`  业务员-客户关联: 30 条`)
    console.log(`  业务员-配方师对接: 20 条`)
  })

  insert()
  await closeDatabase()
}

seedData().catch((err) => {
  console.error('种子数据插入失败:', err)
  process.exit(1)
})
