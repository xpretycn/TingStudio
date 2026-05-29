// 通用工具函数

import { pinyin } from 'pinyin-pro';

/** 生成唯一 ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

/** 获取当前时间 ISO 字符串 */
export function now(): string {
  return new Date().toISOString();
}

/** 构建分页参数 */
export function buildPagination(page?: number, pageSize?: number) {
  const p = Math.max(1, page || 1);
  const size = Math.min(100, Math.max(1, pageSize || 20));
  const offset = (p - 1) * size;
  return { page: p, pageSize: size, offset };
}

/** 构建模糊搜索 LIKE 条件 */
export function buildLike(keyword: string): string {
  return `%${keyword.replace(/[%_\\]/g, "\\$&")}%`;
}

/** 构建成功响应 */
export function success<T = any>(data: T, message = "操作成功") {
  return { success: true, message, data };
}

/** 构建分页成功响应 */
export function successWithPagination<T = any>(list: T[], total: number, page: number, pageSize: number) {
  return {
    success: true,
    message: "查询成功",
    data: {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  };
}

/** 将下划线命名转为驼峰 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** 将驼峰转为下划线命名 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

/** 将数据库行（下划线）转换为对象（驼峰） */
export function rowToCamelCase<T = any>(row: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}

/** 批量转换数据库行 */
export function rowsToCamelCase<T = any>(rows: Record<string, any>[]): T[] {
  return rows.map(row => rowToCamelCase<T>(row));
}

/** 安全解析 JSON */
export function safeJsonParse<T = any>(str: string | null | undefined, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}

const PINYIN_MAP: Record<string, string> = {

  正: "Z",
  阳: "Y",
  湿: "S",
  膏: "G",
  酸: "S",
  枣: "Z",
  仁: "R",
  灵: "L",
  芝: "Z",
  石: "S",
  斛: "H",
  佛: "F",
  手: "S",
  玫: "M",
  苓: "L",
  沫: "M",
  彐: "X",
  淳: "C",
  津: "J",
  源: "Y",
  盈: "G",
  甘: "G",
  绪: "X",
  理: "L",
  补: "B",
  气: "Q",
  养: "Y",
  血: "X",
  清: "Q",
  热: "R",
  解: "J",
  毒: "D",
  健: "J",
  脾: "P",
  胃: "W",
  散: "S",
  滋: "Z",
  阴: "I",
  肾: "K",
  丸: "W",
  活: "H",
  化: "H",
  瘀: "Y",
  安: "A",
  神: "N",
  助: "Z",
  眠: "M",
  茶: "C",
  美: "M",
  容: "R",
  颜: "Y",
  减: "J",
  肥: "F",
  瘦: "S",
  身: "T",
  增: "Z",
  强: "Q",
  免: "M",
  疫: "Y",
  改: "G",
  善: "S",
  睡: "S",
  调: "T",
  经: "J",
  月: "Y",
  缓: "H",
  疲: "P",
  劳: "L",
  记: "J",
  忆: "Y",
  降: "J",
  压: "Y",
  糖: "T",
  护: "H",
  肝: "G",
  润: "R",
  肺: "F",
  止: "Z",
  咳: "K",
  脑: "N",
  益: "Y",
  智: "Z",
  抗: "K",
  衰: "S",
  老: "L",
  促: "C",
  消: "X",
  通: "T",
  便: "B",
  秘: "M",
  温: "W",
  宫: "G",
  寒: "H",
  痛: "T",
  带: "D",
  下: "X",
  盆: "P",
  腔: "Q",
  炎: "Y",
  敏: "M",
  感: "G",
  鼻: "B",
  咽: "Y",
  喉: "H",
  扁: "B",
  桃: "T",
  体: "T",
  腺: "X",
  生: "S",
  颈: "J",
  椎: "Z",
  病: "B",
  腰: "Y",
  肌: "J",
  损: "S",
  骨: "G",
  质: "Z",
  疏: "S",
  松: "S",
  风: "F",
  痹: "B",
  类: "L",
  关: "J",
  节: "J",
  尿: "N",
  高: "G",
  脂: "Z",
  冠: "G",
  心: "X",
  梗: "G",
  塞: "S",
  中: "Z",
  偏: "P",
  瘫: "T",
  面: "M",
  三: "S",
  叉: "C",
  弱: "R",
  更: "G",
  年: "N",
  期: "Q",
  综: "Z",
  合: "H",
  征: "Z",
  抑: "Y",
  郁: "Y",
  焦: "Z",
  虑: "L",
  失: "S",
  多: "D",
  梦: "M",
  盗: "D",
  汗: "H",
  自: "Z",
  口: "K",
  苦: "K",
  臭: "C",
  腋: "Y",
  斑: "B",
  秃: "T",
  痤: "C",
  疮: "C",
  荨: "X",
  麻: "M",
  疹: "Z",
  状: "Z",
  疱: "P",
  银: "Y",
  屑: "X",
  白: "B",
  癜: "D",
  酒: "J",
  渣: "Z",
  乳: "R",
  头: "T",
  癣: "X",
  雀: "Q",
  黄: "H",
  褐: "H",
  晒: "S",
  伤: "S",
  黑: "H",
  色: "S",
  素: "S",
  沉: "C",
};

export function generateFormulaCode(name: string): string {
  let code = "";
  let i = 0;
  while (i < name.length && code.length < 5) {
    const ch = name[i];
    if (PINYIN_MAP[ch]) {
      code += PINYIN_MAP[ch];
      i++;
    } else if (/[\u4e00-\u9fff]/.test(ch)) {
      i++;
    } else {
      i++;
    }
  }
  if (!code || code.length < 2) {
    code = name
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 5);
  }
  if (!code || code.length < 2) {
    code = "FM";
  }
  return code;
}

const MATERIAL_CODE_MAP: Record<string, string> = {
  '铁皮石斛': 'TPSH', '乌梅': 'WM', '酸枣仁': 'SZR', '百合': 'BH', '灵芝': 'LZ',
  '阿胶': 'EJ', '莲子': 'LZ2', '芡实': 'QS', '桑椹': 'SS', '大枣': 'DZ',
  '茯苓': 'FL', '小麦': 'XM', '甘草': 'GC', '陈皮': 'CP', '低聚异麦芽糖': 'DJTMYT',
  '佛手': 'FS', '重瓣玫瑰花': 'PXXM', '重瓣红玫瑰': 'PXWX', '金银花': 'JYH',
  '葛根': 'GG', '荷叶': 'HY', '竹叶黄酮': 'ZYHT', '纳豆': 'ND',
  '显脉旋覆花': 'XMFFH', '栀子': 'ZZ', '西红花': 'XHH', '当归': 'DG',
  '芦根': 'LG', '薄荷': 'BH2', '白芷': 'BZ', '薏苡仁': 'YYR', '化橘红': 'HXH',
  '鱼腥草': 'YXC', '乌药叶': 'WYY', '黄芥子': 'HJZ', '苦杏仁': 'KXR',
  '蒲公英': 'PGY', '麦冬': 'MD', '西洋参': 'XYX', '牡蛎': 'ML', '昆布': 'KB',
  '丹凤牡丹花': 'DFMDH', '麦芽': 'MY', '姜黄': 'JH', '山茱萸': 'SZY',
  '肉桂': 'RG', '山楂': 'SZ', '鸡内金': 'JNJ', 'r-氨基丁酸': 'AJDAS',
  '地龙蛋白肽粉': 'DLBTTF', '黄芪': 'HQ', '沙棘': 'SJ', '枸杞子': 'GQZ',
  '香橼': 'XQ', '平卧菊三七': 'PWJSQ', '桔梗': 'JG', '短梗五加': 'DGWJ',
  '黄精': 'HJ', '桃仁': 'TR', '山药': 'SY', '淡竹叶': 'DZY', '槐花': 'HH2',
  '马齿苋': 'MCX', '藿香': 'HX', '莱菔子': 'LFZ', '杏仁': 'XR', '火麻仁': 'HMR',
  '赤小豆': 'CXD', '党参': 'DS', '炒白扁豆': 'CBD', '草果': 'CG',
  '肉豆蔻': 'RYK', '小茴香': 'XFX', '地龙': 'DL', '全蝎': 'QX', '蜈蚣': 'WC',
  '僵蚕': 'JC', '蝉蜕': 'CT', '牛黄': 'NH', '人参': 'RS', '鹿茸': 'LR',
  '冬虫夏草': 'DCXC', '藏红花': 'ZHH', '川贝': 'CB', '红花': 'HH3',
  '五味子': 'WWZ', '远志': 'YZ', '酸梅膏': 'SMG', '白术': 'BS',
  '薏米': 'YM', '扁豆': 'BD', '神曲': 'SQ', '谷芽': 'GY', '菊花': 'JH2',
  '连翘': 'LQ', '板蓝根': 'BLG', '决明子': 'JMZ', '紫苏': 'ZS',
  '香附': 'XF', '郁金': 'YJ', '延胡索': 'YHS', '丹参': 'DS2', '水蛭': 'SZ2'
};

export function generateMaterialCode(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  if (MATERIAL_CODE_MAP[trimmed]) return MATERIAL_CODE_MAP[trimmed];
  const py = pinyin(trimmed, { pattern: 'first', toneType: 'none', type: 'array' });
  const code = py.map(s => s.charAt(0).toUpperCase()).join('').substring(0, 6);
  return code || 'MAT' + String(Date.now()).slice(-4);
}

export function fixMulterOriginalname(originalname: string): string {
  if (!originalname) return originalname;
  
  try {
    // 如果已经是正常的中文文件名，直接返回
    if (/[\u4e00-\u9fff]/.test(originalname)) {
      return originalname;
    }
    
    // 常见的乱码编码方式列表
    const encodings = [
      { from: 'latin1', to: 'utf8', name: 'Latin1→UTF8' },
      { from: 'binary', to: 'utf8', name: 'Binary→UTF8' },
      { from: 'win1252', to: 'utf8', name: 'Win1252→UTF8' },
      { from: 'iso-8859-1', to: 'utf8', name: 'ISO-8859-1→UTF8' },
      { from: 'cp1252', to: 'utf8', name: 'CP1252→UTF8' },
    ];
    
    let bestResult = originalname;
    let bestScore = 0;
    
    for (const { from, to } of encodings) {
      try {
        const fixed = Buffer.from(originalname, from as BufferEncoding).toString(to as BufferEncoding);
        
        // 如果转换后包含中文字符，且没有替换字符，认为是成功的转换
        if (fixed !== originalname && !/\ufffd/.test(fixed)) {
          const hasChinese = /[\u4e00-\u9fff]/.test(fixed);
          const chineseCount = (fixed.match(/[\u4e00-\u9fff]/g) || []).length;
          
          // 计算得分：中文越多，得分越高
          const score = chineseCount * 10;
          
          if (score > bestScore && hasChinese) {
            bestResult = fixed;
            bestScore = score;
          }
        }
      } catch {
        continue;
      }
    }
    
    // 如果找到了更好的结果，且结果合理，返回修复后的版本
    if (bestScore > 0) {
      return bestResult;
    }
    
    return originalname;
  } catch {
    return originalname;
  }
}

export function isLikelyGarbled(text: string): boolean {
  if (!text) return false;
  
  // 如果包含替换字符，很可能是乱码
  if (/\ufffd/.test(text)) {
    return true;
  }
  
  // 如果同时包含中文和高位的西欧字符，很可能是乱码
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasHighCode = /[\u0080-\u00FF]/.test(text);
  
  if (hasChinese && hasHighCode) {
    return true;
  }
  
  // 如果包含大量西欧字符（超过30%），且没有正常的ASCII扩展字符，可能是乱码
  const westernChars = (text.match(/[\u00C0-\u00FF]/g) || []).length;
  if (westernChars > text.length * 0.3 && !hasChinese) {
    return true;
  }
  
  return false;
}

export function fixGarbledText(text: string): string {
  if (!text) return text;
  try {
    const encodings = ['latin1', 'binary', 'win1252'];
    for (const encoding of encodings) {
      try {
        const fixed = Buffer.from(text, encoding as any).toString('utf8');
        if (fixed !== text && !/\ufffd/.test(fixed)) {
          return fixed;
        }
      } catch {
        continue;
      }
    }
    return text;
  } catch {
    return text;
  }
}

export function buildContentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, '_');
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}