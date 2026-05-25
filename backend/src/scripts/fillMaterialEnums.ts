import Database from "better-sqlite3";

const db = new Database("./data/tingstudio.db");

interface EnumValues {
  appearance: string[];
  taste: string[];
  efficacy: string[];
}

const materialEnumMap: Record<string, EnumValues> = {
  "百合": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "清凉感", "滑润感"],
    efficacy: ["养血安神", "健脾养胃"]
  },
  "栀子": {
    appearance: ["颗粒", "块状"],
    taste: ["苦味", "清凉感"],
    efficacy: ["泻火除烦", "清热解毒"]
  },
  "陈皮": {
    appearance: ["块状", "颗粒"],
    taste: ["辛味", "苦味", "陈味"],
    efficacy: ["健脾养胃", "行气止痛"]
  },
  "薄荷": {
    appearance: ["颗粒", "粉末"],
    taste: ["辛味", "清凉感", "草本香"],
    efficacy: ["疏肝解郁", "清热解毒"]
  },
  "赤小豆": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "颗粒感"],
    efficacy: ["利水渗湿", "健脾养胃"]
  },
  "白术": {
    appearance: ["块状", "粉末"],
    taste: ["甘味", "苦味", "药香"],
    efficacy: ["健脾养胃", "利水渗湿"]
  },
  "当归": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "辛味", "药香"],
    efficacy: ["养血安神", "活血化瘀"]
  },
  "淡竹叶": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "清凉感", "草本香"],
    efficacy: ["泻火除烦", "清热解毒"]
  },
  "党参": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "药香"],
    efficacy: ["补中益气", "健脾养胃"]
  },
  "桑椹": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "酸味", "清香"],
    efficacy: ["滋补肝肾", "养血安神"]
  },
  "茯苓": {
    appearance: ["块状", "粉末"],
    taste: ["甘味", "泥土味"],
    efficacy: ["健脾养胃", "利水渗湿"]
  },
  "枸杞子": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "滑润感", "清香"],
    efficacy: ["滋补肝肾", "养血安神"]
  },
  "沙棘": {
    appearance: ["颗粒", "块状"],
    taste: ["酸味", "甘味", "清香"],
    efficacy: ["健脾养胃", "生津止渴"]
  },
  "佛手": {
    appearance: ["块状", "颗粒"],
    taste: ["辛味", "苦味", "清香"],
    efficacy: ["疏肝解郁", "行气止痛"]
  },
  "阿胶": {
    appearance: ["块状", "膏状"],
    taste: ["甘味", "滑润感"],
    efficacy: ["养血安神", "滋补肝肾"]
  },
  "槐花": {
    appearance: ["颗粒", "粉末"],
    taste: ["苦味", "清香"],
    efficacy: ["清热解毒", "清肝明目"]
  },
  "葛根": {
    appearance: ["块状", "粉末"],
    taste: ["甘味", "辛味", "药香"],
    efficacy: ["生津止渴", "健脾养胃"]
  },
  "黄精蜜炼": {
    appearance: ["膏状", "块状"],
    taste: ["甘味", "滑润感", "药香"],
    efficacy: ["滋补肝肾", "补中益气"]
  },
  "甘草": {
    appearance: ["块状", "粉末"],
    taste: ["甘味", "药香"],
    efficacy: ["补中益气", "化痰止咳"]
  },
  "黄精": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "药香", "滑润感"],
    efficacy: ["滋补肝肾", "补中益气"]
  },
  "桔梗": {
    appearance: ["块状", "颗粒"],
    taste: ["苦味", "辛味", "药香"],
    efficacy: ["化痰止咳", "敛肺止咳"]
  },
  "藿香": {
    appearance: ["颗粒", "块状"],
    taste: ["辛味", "草本香", "清香"],
    efficacy: ["健脾养胃", "行气止痛"]
  },
  "火麻仁": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "滑润感"],
    efficacy: ["健脾养胃", "利水渗湿"]
  },
  "黄芪": {
    appearance: ["块状", "粉末"],
    taste: ["甘味", "药香"],
    efficacy: ["补中益气", "利水渗湿"]
  },
  "金银花": {
    appearance: ["颗粒", "粉末"],
    taste: ["甘味", "清凉感", "清香"],
    efficacy: ["清热解毒", "疏肝解郁"]
  },
  "香橼": {
    appearance: ["块状", "颗粒"],
    taste: ["辛味", "酸味", "清香"],
    efficacy: ["疏肝解郁", "行气止痛"]
  },
  "小茴香": {
    appearance: ["颗粒", "粉末"],
    taste: ["辛味", "草本香"],
    efficacy: ["行气止痛", "健脾养胃"]
  },
  "灵芝": {
    appearance: ["块状", "粉末"],
    taste: ["苦味", "药香", "泥土味"],
    efficacy: ["补中益气", "养血安神"]
  },
  "莲子": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "涩感"],
    efficacy: ["健脾养胃", "涩肠止泻"]
  },
  "鸡内金": {
    appearance: ["块状", "粉末"],
    taste: ["甘味", "咸味"],
    efficacy: ["健脾养胃", "涩肠止泻"]
  },
  "小麦": {
    appearance: ["颗粒", "粉末"],
    taste: ["甘味", "颗粒感"],
    efficacy: ["健脾养胃", "养血安神"]
  },
  "荷叶": {
    appearance: ["块状", "颗粒"],
    taste: ["苦味", "涩感", "草本香"],
    efficacy: ["清热解毒", "利水渗湿"]
  },
  "昆布": {
    appearance: ["块状", "有沉淀"],
    taste: ["咸味", "涩感", "泥土味"],
    efficacy: ["化痰止咳", "利水渗湿"]
  },
  "炒白扁豆": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "焦香"],
    efficacy: ["健脾养胃", "利水渗湿"]
  },
  "山茱萸": {
    appearance: ["颗粒", "块状"],
    taste: ["酸味", "涩感", "药香"],
    efficacy: ["滋补肝肾", "敛肺止咳"]
  },
  "姜黄": {
    appearance: ["块状", "粉末"],
    taste: ["辛味", "苦味", "药香"],
    efficacy: ["活血化瘀", "行气止痛"]
  },
  "丹凤牡丹花": {
    appearance: ["颗粒", "粉末"],
    taste: ["苦味", "辛味", "清香"],
    efficacy: ["活血化瘀", "清热解毒"]
  },
  "莱菔子": {
    appearance: ["颗粒", "粉末"],
    taste: ["辛味", "甘味"],
    efficacy: ["健脾养胃", "行气止痛"]
  },
  "蒲公英": {
    appearance: ["颗粒", "粉末"],
    taste: ["苦味", "甘味", "草本香"],
    efficacy: ["清热解毒", "清肝明目"]
  },
  "牡蛎": {
    appearance: ["块状", "粉末"],
    taste: ["咸味", "涩感"],
    efficacy: ["滋补肝肾", "敛肺止咳"]
  },
  "麦芽": {
    appearance: ["颗粒", "粉末"],
    taste: ["甘味", "焦香"],
    efficacy: ["健脾养胃", "行气止痛"]
  },
  "纳豆": {
    appearance: ["颗粒", "浑浊"],
    taste: ["咸味", "滑润感", "泥土味"],
    efficacy: ["健脾养胃", "活血化瘀"]
  },
  "苦杏仁": {
    appearance: ["颗粒", "块状"],
    taste: ["苦味", "药香"],
    efficacy: ["化痰止咳", "敛肺止咳"]
  },
  "西洋参": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "苦味", "药香"],
    efficacy: ["补中益气", "生津止渴"]
  },
  "黄芥子": {
    appearance: ["颗粒", "粉末"],
    taste: ["辛味", "苦味"],
    efficacy: ["化痰止咳", "行气止痛"]
  },
  "化橘红": {
    appearance: ["块状", "颗粒"],
    taste: ["苦味", "辛味", "药香"],
    efficacy: ["化痰止咳", "行气止痛"]
  },
  "地龙蛋白肽粉": {
    appearance: ["粉末", "有沉淀"],
    taste: ["咸味", "泥土味"],
    efficacy: ["活血化瘀", "清热解毒"]
  },
  "麦冬": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "苦味", "滑润感"],
    efficacy: ["养血安神", "生津止渴"]
  },
  "马齿苋": {
    appearance: ["颗粒", "块状"],
    taste: ["酸味", "甘味", "草本香"],
    efficacy: ["清热解毒", "利水渗湿"]
  },
  "芦根": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "清凉感"],
    efficacy: ["生津止渴", "清热解毒"]
  },
  "乌药叶": {
    appearance: ["颗粒", "块状"],
    taste: ["辛味", "草本香"],
    efficacy: ["行气止痛", "疏肝解郁"]
  },
  "肉桂": {
    appearance: ["块状", "粉末"],
    taste: ["辛味", "甘味", "药香"],
    efficacy: ["行气止痛", "补中益气"]
  },
  "白芷": {
    appearance: ["块状", "粉末"],
    taste: ["辛味", "苦味", "药香"],
    efficacy: ["疏肝解郁", "清热解毒"]
  },
  "重瓣玫瑰花": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "清香", "涩感"],
    efficacy: ["疏肝解郁", "活血化瘀"]
  },
  "肉豆蔻": {
    appearance: ["块状", "颗粒"],
    taste: ["辛味", "涩感", "药香"],
    efficacy: ["涩肠止泻", "行气止痛"]
  },
  "芡实": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "涩感"],
    efficacy: ["健脾养胃", "涩肠止泻"]
  },
  "重瓣红玫瑰": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "酸味", "清香"],
    efficacy: ["疏肝解郁", "活血化瘀"]
  },
  "铁皮石斛": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "滑润感", "草本香"],
    efficacy: ["滋补肝肾", "生津止渴"]
  },
  "桑葫鲜果": {
    appearance: ["颗粒", "浑浊"],
    taste: ["酸味", "甘味", "清香"],
    efficacy: ["健脾养胃", "养血安神"]
  },
  "草果": {
    appearance: ["块状", "颗粒"],
    taste: ["辛味", "药香"],
    efficacy: ["健脾养胃", "行气止痛"]
  },
  "酸枣蜜炼": {
    appearance: ["膏状", "浑浊"],
    taste: ["酸味", "甘味", "滑润感"],
    efficacy: ["养血安神", "滋补肝肾"]
  },
  "显脉旋覆花": {
    appearance: ["颗粒", "块状"],
    taste: ["苦味", "辛味", "草本香"],
    efficacy: ["化痰止咳", "行气止痛"]
  },
  "山药": {
    appearance: ["块状", "粉末"],
    taste: ["甘味", "滑润感"],
    efficacy: ["健脾养胃", "补中益气"]
  },
  "山楂": {
    appearance: ["颗粒", "块状"],
    taste: ["酸味", "甘味", "清香"],
    efficacy: ["健脾养胃", "活血化瘀"]
  },
  "平卧菊三七": {
    appearance: ["颗粒", "块状"],
    taste: ["甘味", "草本香", "涩感"],
    efficacy: ["清热解毒", "活血化瘀"]
  },
  "大枣": {
    appearance: ["块状", "颗粒"],
    taste: ["甘味", "清香"],
    efficacy: ["补中益气", "养血安神"]
  },
  "低聚异麦芽糖": {
    appearance: ["粉末", "颗粒"],
    taste: ["甘味", "滑润感"],
    efficacy: ["健脾养胃", "补中益气"]
  },
  "薏苡仁": {
    appearance: ["颗粒", "粉末"],
    taste: ["甘味", "泥土味"],
    efficacy: ["健脾养胃", "利水渗湿"]
  },
  "酸枣仁": {
    appearance: ["颗粒", "块状"],
    taste: ["酸味", "甘味", "药香"],
    efficacy: ["养血安神", "滋补肝肾"]
  },
  "西红花": {
    appearance: ["颗粒", "粉末"],
    taste: ["甘味", "苦味", "清香"],
    efficacy: ["活血化瘀", "养血安神"]
  },
  "乌梅": {
    appearance: ["块状", "颗粒"],
    taste: ["酸味", "涩感", "陈味"],
    efficacy: ["敛肺止咳", "涩肠止泻"]
  },
  "鱼腥草": {
    appearance: ["颗粒", "块状"],
    taste: ["辛味", "泥土味", "草本香"],
    efficacy: ["清热解毒", "化痰止咳"]
  },
  "桃仁": {
    appearance: ["颗粒", "块状"],
    taste: ["苦味", "甘味"],
    efficacy: ["活血化瘀", "行气止痛"]
  },
  "杏仁": {
    appearance: ["颗粒", "块状"],
    taste: ["苦味", "药香"],
    efficacy: ["化痰止咳", "敛肺止咳"]
  },
  "短梗五加": {
    appearance: ["块状", "颗粒"],
    taste: ["辛味", "苦味", "药香"],
    efficacy: ["补中益气", "滋补肝肾"]
  }
};

const skipNames = new Set([
  "测试枚举原料",
  "测试原料121",
  "依旧测试11",
  "顶顶顶",
  "烦烦烦"
]);

const rows = db.prepare("SELECT id, name, appearance_json, taste_json, efficacy_json FROM materials").all();

const updateStmt = db.prepare(
  "UPDATE materials SET appearance_json = ?, taste_json = ?, efficacy_json = ?, updated_at = datetime('now') WHERE id = ?"
);

let updated = 0;
let skipped = 0;

const transaction = db.transaction(() => {
  for (const row of rows) {
    const { id, name, appearance_json, taste_json, efficacy_json } = row;

    if (appearance_json && taste_json && efficacy_json) {
      skipped++;
      continue;
    }

    if (skipNames.has(name)) {
      skipped++;
      continue;
    }

    if (name.includes("?") || name.includes("-1779")) {
      skipped++;
      continue;
    }

    const enumValues = materialEnumMap[name];
    if (!enumValues) {
      console.log(`[SKIP] No mapping for: ${name} (id: ${id})`);
      skipped++;
      continue;
    }

    updateStmt.run(
      JSON.stringify(enumValues.appearance),
      JSON.stringify(enumValues.taste),
      JSON.stringify(enumValues.efficacy),
      id
    );
    updated++;
    console.log(`[OK] ${name}: appearance=${enumValues.appearance.join(",")} taste=${enumValues.taste.join(",")} efficacy=${enumValues.efficacy.join(",")}`);
  }
});

transaction();

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, Total: ${rows.length}`);

const verifyRows = db.prepare("SELECT id, name, appearance_json, taste_json, efficacy_json FROM materials WHERE appearance_json IS NOT NULL").all();
console.log(`\nVerification: ${verifyRows.length} materials now have enum values`);

db.close();
