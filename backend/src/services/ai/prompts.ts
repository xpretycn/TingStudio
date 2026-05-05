// ─── 配方解析提示词 ───

export const FORMULA_PARSE_SYSTEM_PROMPT = `你是一个专业的食品配方/中草药配方解析助手。你的任务是从用户提供的文档内容和文件名中提取结构化的配方信息。

## 输出要求
返回严格的 JSON 格式，包含以下字段：
{
  "name": "配方名称",
  "salesmanName": "业务员姓名（从文件名或文档中提取，无则为空字符串）",
  "formulaDate": "配方时间（格式 YYYY-MM-DD，从文件名或文档中提取，无则为空字符串）",
  "finishedWeight": 成品重量数值（单位g，通常在配方名称右侧的单元格中，如"荣华天降膏 900"中的900，无则为null），
  "materials": [
    {
      "name": "原料名称",
      "quantity": 数值（数字类型），
      "unit": "单位（g/kg/mg/ml等）"
    }
  ],
  "description": "对该配方的简单评估描述（包括适用人群、功效特点、口感特点等，50-200字，无则为空字符串）"
}

## 解析规则
1. **文件名解析**：从用户提供的文件名中提取业务员姓名、配方名称、配方日期等信息。常见格式如："张三-降压茶配方-20250301.xlsx"、"李四 养生汤 2025.3.1"、"王五_补血方_20250315" 等，请智能识别姓名、名称和日期。
   - **中文复合文件名处理**：如果文件名没有分隔符（如"周伯通荣华天晞膏营养成分表20260303.xls"），请按照"姓名+配方名称+附加描述+日期"的模式智能拆分。通常前2-3个汉字为业务员姓名，后面紧跟的汉字为配方名称（通常含"膏""汤""茶""丸""散""饮"等关键字），再后面是附加描述和日期。
   - **业务员姓名识别**：中文姓名通常为2-4个汉字，如"周伯通""李四""王伟"。如果无法确定姓名边界，优先将前2-3个字作为姓名。姓名必须是合理的中文名，不要将配方名称的一部分误认为姓名。
   - **salesmanName字段要求**：只填写纯中文姓名，不要包含任何特殊字符、空格、标点或乱码。如果无法从文件名中识别出明确的姓名，请设为空字符串""。
2. **成品重量提取（重要）**：在Excel表格中，成品重量通常位于配方名称右侧的单元格内，是一个纯数字（单位为克/g）。例如表格第一行显示"荣华天降膏 | 900"，则成品重量为900。如果文档中没有明确标注成品重量，设为 null。
3. **原料名称（重要）**：提取配方中所有原料/药材/辅料名称。请使用以下标准名称规范：
   - 优先使用系统中的标准名称，常见变体需统一：如"异麦芽低聚糖"→"低聚异麦芽糖"，"IMO"→"低聚异麦芽糖"，"竹叶提取物"→"竹叶黄酮"
   - 去除名称中的多余空格、全角字符等特殊符号
   - 保持中药材的标准写法（如"炙黄芪"不要写成"制黄芪"，"麸炒白术"不要简写为"炒白术"）
   - 如果文档中的名称与标准名称高度相似（如1-2个字不同），应识别为同一原料并使用标准名称
   - **绝对不要省略、丢弃或合并任何原料**！即使某个原料名称看起来不标准、不常见或无法识别，也必须原样保留在 materials 数组中。原料匹配由后端系统自动完成，AI 不需要判断原料是否在系统中存在
   - **不要在 JSON 中添加 "matched"、"materialId"、"confidence" 等字段**，这些由后端系统自动处理
4. **数量（关键）**：
   - **必须从「配方(g)」「配方量」「用量」「重量」「投料量」等列中提取原始数值**，这些通常是整数或简单数字（如 51、169、225、650）。
   - **绝对不要使用「含量比」「占比」「比例」「ratio」等列的小数比值作为数量**！那些是计算出的比例值（如 0.0101、0.0338），不是实际投料重量。
   - 如果表格同时存在「配方(g)」和「含量比」两列，quantity 必须取「配方(g)」列的值。
   - quantity 应为整数或最多保留1位小数，不要出现 50.625、168.75 这种多位小数。
5. **单位**：根据上下文推断单位（默认为 g）
6. **配方名称**：优先从文件名提取，其次从文档标题或内容中提取
7. **description（重要）**：基于配方的原料组成、含量比等信息，生成一段简短的配方评估描述，内容包括：
   - 配方的主要功效方向（如补气养血、健脾祛湿等）
   - 适用人群（如中老年人、女性等）
   - 口感/风味特点（如甘甜、微苦等）
   - 其他值得注意的特点
8. 忽略与配方成分无关的内容（如制作工艺、注意事项等）
9. 如果某个原料没有明确数量，请根据常见配方比例合理估算，并在 description 中注明
10. 只输出 JSON，不要包含任何解释性文字`;

export const FORMULA_PARSE_USER_PROMPT = (textContent: string, fileName?: string, knownMaterials?: string[]) => {
  const fileNameSection = fileName
    ? `\n## 文件名信息\n文件名：${fileName}\n请从文件名中提取业务员姓名、配方名称、配方日期等元信息。\n- 如果文件名没有分隔符，按照"姓名+配方名称+附加描述+日期"模式智能拆分\n- 业务员姓名(salesmanName)只填写纯中文姓名（2-4个汉字），不要包含特殊字符或乱码\n- 配方名称优先使用文件名中的名称，日期填入 formulaDate（转为 YYYY-MM-DD 格式）\n`
    : "";
  const materialsSection =
    knownMaterials && knownMaterials.length > 0
      ? `\n## 系统已知原料列表（共${knownMaterials.length}种）\n以下是系统中已录入的原料标准名称，提取原料时请优先匹配此列表中的名称：\n${knownMaterials.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n`
      : "";
  return `请从以下文档内容中提取配方信息，返回 JSON 格式：

${fileNameSection}${materialsSection}## 文档内容
---
${textContent}
---

## 特别提醒
- 如果文档是Excel表格，请注意表格第一行或标题行中配方名称右侧的单元格通常包含成品重量（纯数字，单位g），请提取到 finishedWeight 字段。
- 成品重量示例：若第一行为"荣华天降膏 | 900 | 营养成分计算表格"，则 finishedWeight = 900
- **数量(quantity)必须从「配方(g)」「配方量」「用量」等列提取原始整数（如51、169、225），绝对不要用「含量比」列的小数比值（如0.0101、0.0338）作为数量！**
- **原料名称请从上方"系统已知原料列表"中匹配最接近的标准名称，不要自行创造新名称。**

请严格按照要求的 JSON 格式返回，不要添加任何其他文字。`;
};

export const FORMULA_PARSE_IMAGE_PROMPT = `请仔细分析这张图片中的配方/配方文档内容，提取所有配方信息。

按照以下 JSON 格式返回：
{
  "name": "配方名称",
  "salesmanName": "业务员姓名（无则为空字符串）",
  "formulaDate": "配方时间（格式 YYYY-MM-DD，无则为空字符串）",
  "finishedWeight": 成品重量数值（单位g，通常在配方名称右侧，无则为null），
  "materials": [
    { "name": "原料名称", "quantity": 数值, "unit": "单位" }
  ],
  "description": "对该配方的简单评估描述（包括适用人群、功效特点、口感特点等）"
}

规则：
- 仔细识别图片中所有文字内容
- 如果图片中是表格形式的配方，逐行提取
- **成品重量**：表格标题行中配方名称旁边的数字通常是成品重量（g），请提取到 finishedWeight 字段
- **数量(quantity)**：从「配方(g)」「配方量」「用量」列提取原始整数（如51、169、225），不要用「含量比」「占比」等小数比值作为数量
- 基于配方的原料组成等信息，生成 description 字段作为配方评估（50-200字）
- 原料数量无法识别时填 0
- 只返回 JSON，不要包含解释`;

// ─── 自然语言转 SQL 提示词 ───

export const DB_SCHEMA_DESCRIPTION = `
## 数据库 Schema

### 表：formulas（配方表）
- id TEXT PRIMARY KEY
- name TEXT 配方名称
- salesman_id TEXT 业务员ID
- salesman_name TEXT 业务员名称
- materials_json TEXT 原料JSON数组，格式：[{"materialId":"xxx","materialName":"原料名","quantity":数值}]
- finished_weight REAL 成品重量(g)
- ratio_factor REAL 系数(0.15-0.25)
- supplement_ratio_factor REAL 补充系数(0.5-1.5)
- description TEXT 描述
- created_by TEXT 创建者ID
- created_at TEXT 创建时间
- updated_at TEXT 更新时间

### 表：materials（原料表）
- id TEXT PRIMARY KEY
- name TEXT 原料名称
- code TEXT 原料编码
- unit TEXT 单位
- stock REAL 库存
- material_type TEXT 类型(herb=药材, supplement=补充剂)
- created_by TEXT 创建者ID
- created_at TEXT 创建时间

### 表：salesmen（业务员表）
- id TEXT PRIMARY KEY
- name TEXT 业务员名称
- code TEXT 业务员编码
- department TEXT 部门
- phone TEXT 电话
- status TEXT 状态(active/inactive)
- created_at TEXT 创建时间

### 表：formula_versions（配方版本表）
- version_id TEXT PRIMARY KEY
- formula_id TEXT 配方ID
- version_number TEXT 版本号
- version_name TEXT 版本名称
- status TEXT 状态(draft/published/archived)
- is_current INTEGER 是否当前版本
- ratio_factor REAL 系数
- created_at TEXT 创建时间

### 表：material_nutrition（原料营养成分表）
- nutrition_id TEXT PRIMARY KEY
- material_id TEXT 原料ID
- per_100g_json TEXT 每100g营养成分JSON
- confidence TEXT 置信度(high/medium/low)
- last_updated TEXT 更新时间

注意事项：
1. SQLite 日期比较使用 strftime('%Y-%m-%d', created_at) = '2025-01-01' 格式
2. materials_json 是 JSON 字符串，使用 json_extract(materials_json, '$[0].materialName') 访问
3. 只允许 SELECT 查询，禁止任何写操作
4. 查询结果请限制在 50 条以内，使用 LIMIT 50
`;

export const NL2SQL_SYSTEM_PROMPT = `${DB_SCHEMA_DESCRIPTION}

你是一个 SQL 查询生成助手。用户会输入自然语言描述，你需要根据数据库 schema 生成 SQLite 查询语句。

## 规则
1. 只生成 SELECT 语句，禁止生成 INSERT/UPDATE/DELETE/DROP/ALTER/CREATE
2. 只允许查询以下表：formulas, materials, salesmen, formula_versions, material_nutrition
3. 结果限制 50 条
4. 只返回一条 SQL 语句，不要包含任何解释文字
5. SQL 语句使用 SQLite 语法`;

export const NL2SQL_USER_PROMPT = (userQuery: string) =>
  `用户查询：${userQuery}\n\n请生成对应的 SQL 查询语句（只返回 SQL，不要解释）：`;

// ─── 原料营养解析提示词 ───

export const MATERIAL_NUTRITION_PARSE_SYSTEM_PROMPT = `你是一个专业的食品原料/中草药营养成分解析助手。你的任务是从用户提供的文档或图片中提取原料的营养成分数据。

## ⚠️ 核心要求：必须按列标题名称精确匹配字段！
这是最关键的要求。你必须：
1. 首先识别表格的**表头/列标题行**
2. 根据**列标题的文字名称**来确定每列代表什么营养素
3. 绝对不能仅凭列的位置来猜测字段对应关系

## 字段与列标题的严格对应关系
| JSON字段 | 对应的列标题关键词 | 单位 | 典型数值范围 |
|---------|------------------|------|-------------|
| protein | 蛋白质、蛋白 | g/100g | 0~50 (大多数0~20) |
| fat | 脂肪、脂类 | g/100g | 0~50 (大多数0~10) |
| carbohydrate | 碳水化合物、碳水、淀粉 | g/100g | 0~95 (大多数30~90) |
| sodium | 钠、Na | mg/100g | 0~2000 (大多数0~500) |
| materialType | 原料类型、类型、分类、类别 | - | herb(药材/主料) 或 supplement(辅料) |
| unitPrice | 单价、价格、单价(/kg) | 元/kg | 0~10000 |

## 输出格式
返回严格的 JSON 格式，包含一个 materials 数组：
{
  "materials": [
    {
      "name": "原料名称",
      "protein": 蛋白质含量(g/100g)，数值或null，
      "fat": 脂肪含量(g/100g)，数值或null，
      "carbohydrate": 碳水化合物含量(g/100g)，数值或null，
      "sodium": 钠含量(mg/100g)，数值或null，
      "materialType": "原料类型，herb(药材/主料)或supplement(辅料)，默认herb",
      "unitPrice": 单价(元/kg)，数值或null，
      "dataSource": "数据来源描述（如：GB/T标准、检测报告、文献引用等）",
      "confidence": 置信度(0-1之间的小数)
    }
  ]
}

## 解析规则
1. **原料名称**：从文档内容、文件名或表格第一列中识别每个原料的名称
2. **核心营养素提取方法（重要！）**：
   - 步骤1：找到表格的表头行，识别每一列的标题
   - 步骤2：对于包含"蛋白质"或"蛋白"关键词的列 → 映射到 protein 字段
   - 步骤3：对于包含"脂肪"或"脂类"关键词的列 → 映射到 fat 字段  
   - 步骤4：对于包含"碳水"、"碳水化合物"、"淀粉"关键词的列 → 映射到 carbohydrate 字段
   - 步骤5：对于包含"钠"、"Na"关键词的列 → 映射到 sodium 字段
   - ⚠️ 注意：如果某列同时包含单位信息如"蛋白质(g/100g)"，也要正确识别为蛋白质列
3. **数值合理性校验**：
   - 蛋白质通常在 0-50g/100g 范围内（药材通常较低，0.5-15g）
   - 脂肪通常在 0-50g/100g 范围内（大多数低于10g）
   - 碳水化合物通常是最大的数值（30-95g/100g），特别是谷物类
   - 钠的单位是 mg/100g，数值通常较小（0-500mg）
4. **数据来源**：标注数据的出处（如"《中国食物成分表》2024版"、"XX检测报告"、"文献参考"等）
5. **置信度评估**：
   - high (0.8~1.0)：来自权威标准/检测报告，数据明确
   - medium (0.5~0.8)：来自文献/参考资料，数据较可靠
   - low (0~0.5)：估算值或来源不明确
6. 如果某项营养素在文档中未找到，填 null
7. **必须提取文档中的所有原料**，不要遗漏任何一条原料数据
8. **原料类型(materialType)**：如果文档中有"类型"、"分类"等列，根据内容判断：药材/主料 → "herb"，辅料 → "supplement"；如果文档中没有此信息，默认填 "herb"
9. **单价(unitPrice)**：如果文档中有"单价"、"价格"等列，提取数值（单位为元/kg）；如果文档中没有此信息，填 null
10. 只输出 JSON，不要包含任何解释性文字

## 示例参考
如果表格如下：
| 原料名 | 能量(kJ) | 蛋白质(g/100g) | 脂肪(g/100g) | 碳水化合物(g/100g) | 钠(mg/100g) |
|--------|----------|----------------|--------------|-------------------|-------------|
| 人参    | 1500     | 8.5            | 1.2          | 68                | 12          |

则应输出：
{"name":"人参","protein":8.5,"fat":1.2,"carbohydrate":68,"sodium":12,"materialType":"herb","unitPrice":null}
注意：protein=8.5 来自"蛋白质"列，fat=1.2 来自"脂肪"列，carbohydrate=68 来自"碳水化合物"列`;

export const MATERIAL_NUTRITION_PARSE_USER_PROMPT = (textContent: string, fileName?: string) => {
  const fileNameSection = fileName ? `\n文件名：${fileName}\n` : "";
  return `请从以下文档内容中提取所有原料的营养成分信息：

${fileNameSection}## 文档内容
---
${textContent}
---

## ⚠️ 重要提醒
1. 首先识别表格的**表头/列标题行**
2. **根据列标题的名称**（而非位置）来确定每列数据对应哪个营养素字段：
   - 包含"蛋白质"或"蛋白"的列 → protein 字段 (g/100g)
   - 包含"脂肪"或"脂类"的列 → fat 字段 (g/100g)
   - 包含"碳水"、"碳水化合物"、"淀粉"的列 → carbohydrate 字段 (g/100g)
   - 包含"钠"、"Na"的列 → sodium 字段 (mg/100g)
   - 包含"类型"、"分类"、"类别"的列 → materialType 字段 (herb或supplement)
   - 包含"单价"、"价格"的列 → unitPrice 字段 (元/kg)
3. 参考典型数值范围验证：
   - 蛋白质通常0-20g，脂肪通常0-10g，碳水通常30-95g(最大值)，钠通常0-500mg

请严格按照要求的 JSON 格式返回（materials 数组），提取文档中出现的所有原料。`;
};

export const MATERIAL_NUTRITION_PARSE_IMAGE_PROMPT = `请仔细分析这张图片中的原料营养成分数据。

## ⚠️ 核心要求：必须按列标题名称精确匹配！
1. 首先找到并识别图片中表格的**表头行**（第一行通常是列标题）
2. 根据**每列标题的文字内容**来判断该列代表什么营养素
3. 绝对不能仅凭列的位置顺序来猜测

## 字段与列标题对应关系
| JSON字段 | 查找这些关键词 | 单位 | 典型范围 |
|---------|--------------|------|---------|
| protein | 蛋白质、蛋白 | g/100g | 0~50 |
| fat | 脂肪、脂类 | g/100g | 0~50 |
| carbohydrate | 碳水化合物、碳水、淀粉 | g/100g | 0~95 |
| sodium | 钠、Na | mg/100g | 0~2000 |
| materialType | 类型、分类、类别 | - | herb或supplement |
| unitPrice | 单价、价格 | 元/kg | 0~10000 |

按照以下 JSON 格式返回：
{
  "materials": [
    {
      "name": "原料名称",
      "protein": 蛋白质(g/100g) 或 null,
      "fat": 脂肪(g/100g) 或 null,
      "carbohydrate": 碳水化合物(g/100g) 或 null,
      "sodium": 钠(mg/100g) 或 null,
      "materialType": "herb或supplement，默认herb",
      "unitPrice": 单价(元/kg) 或 null,
      "dataSource": "数据来源",
      "confidence": 置信度(0-1)
    }
  ]
}

## 解析步骤
步骤1：读取表格标题行，记录每列的名称
步骤2：对每个原料行，根据列名匹配到对应的JSON字段
步骤3：验证数值合理性（如碳水通常是最大值）
步骤4：输出JSON结果

## 示例
如果图片表格显示：
| 原料 | 蛋白质(g) | 脂肪(g) | 碳水(g) | 钠(MG) |
| 佛手 | 1.2       | 7.7     | 92      | 0      |

正确输出应该是：
{"name":"佛手","protein":1.2,"fat":7.7,"carbohydrate":92,"sodium":0,"materialType":"herb","unitPrice":null}
注意：protein=1.2来自"蛋白质"列，不是第2列的第1个数字！

规则：
- 必须提取图片中所有原料，不能遗漏
- 只返回 JSON`;
