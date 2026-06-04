import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import NutritionExcelImport from "@/components/NutritionExcelImport.vue";

const { aoa_to_sheet, book_new, book_append_sheet, writeFile, read, sheet_to_json } = vi.hoisted(() => ({
  aoa_to_sheet: vi.fn(() => ({})),
  book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
  book_append_sheet: vi.fn(),
  writeFile: vi.fn(),
  read: vi.fn(() => ({
    Sheets: { Sheet1: {} },
    SheetNames: ["Sheet1"],
  })),
  sheet_to_json: vi.fn(),
}));

vi.mock("xlsx", () => ({
  read,
  writeFile,
  utils: {
    aoa_to_sheet,
    book_new,
    book_append_sheet,
    sheet_to_json,
  },
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Button: { name: "Button", template: "<button><slot /></button>" },
  Card: { name: "Card", template: "<div><slot /></div>" },
  Upload: { name: "Upload", template: "<div><slot /></div>" },
  Tag: { name: "Tag", template: "<span><slot /></span>" },
  Space: { name: "Space", template: "<div><slot /></div>" },
  Table: { name: "Table", template: "<div><slot /></div>" },
  Alert: { name: "Alert", template: '<div><slot name="title" /><slot /></div>' },
}));

type NutritionComponentVM = {
  beforeUpload: (file: { raw: File }) => boolean;
  handleUpload: (file: { raw: File }) => Promise<void>;
  parseResult: { nutritionData: Record<string, number>; dataSource?: string; [key: string]: unknown } | null;
  validNutrients: unknown[];
  validNutrientCount: number;
  unknownFields: unknown[];
  confirmImport: () => void;
  cancelImport: () => void;
};

describe("NutritionExcelImport 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    wrapper = mount(NutritionExcelImport, {
      global: {
        stubs: {
          "t-alert": { template: '<div><slot name="title" /><slot /></div>' },
          "t-button": { template: "<button><slot /></button>" },
          "t-card": { template: "<div><slot /></div>" },
          "t-upload": { template: "<div><slot /></div>" },
          "t-tag": { template: "<span><slot /></span>" },
          "t-space": { template: "<div><slot /></div>" },
          "t-table": { template: "<div><slot /></div>" },
          "t-icon": { template: "<span></span>" },
        },
      },
    });
  });

  it("N01: 默认渲染应显示标题和两个操作按钮", () => {
    const title = wrapper.find(".guide-title");
    expect(title.exists()).toBe(true);
    expect(title.text()).toContain("营养素 Excel 导入");

    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("N02: 点击下载模板应调用 XLSX 生成 Excel 文件", async () => {
    const buttons = wrapper.findAll("button");
    const downloadBtn = buttons[0];
    await downloadBtn.trigger("click");

    await wrapper.vm.$nextTick();

    expect(aoa_to_sheet).toHaveBeenCalled();
    expect(book_new).toHaveBeenCalled();
    expect(book_append_sheet).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(expect.any(Object), "营养素导入模板.xlsx");
  });

  it("N03: 模板应包含正确的表头和营养素行", async () => {
    const buttons = wrapper.findAll("button");
    const downloadBtn = buttons[0];
    await downloadBtn.trigger("click");

    const sheetRows = aoa_to_sheet.mock.calls[0]?.[0] as string[][];
    expect(sheetRows).toBeDefined();
    expect(sheetRows.length).toBe(35);
    expect(sheetRows[0]).toEqual(["营养成分", "数值", "单位"]);
    expect(sheetRows[4]).toEqual(["蛋白质", "", "g"]);
    expect(sheetRows[34]).toEqual(["反式脂肪", "", "g"]);
  });

  it("N04: 上传非 Excel 文件应返回 false 阻止上传", () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    const txtFile = new File(["test"], "data.txt", { type: "text/plain" });
    const result = component.beforeUpload({ raw: txtFile });

    expect(result).toBe(false);
  });

  it("N05: 上传超过 5MB 的文件应返回 false 阻止上传", () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    const bigFile = new File(["x".repeat(6 * 1024 * 1024)], "big.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const result = component.beforeUpload({ raw: bigFile });

    expect(result).toBe(false);
  });

  it("N06: 解析有效 Excel 应设置 parseResult 并填充 nutritionData", async () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    sheet_to_json.mockReturnValue([
      ["能量", "1600", "kJ"],
      ["蛋白质", "20.5", "g"],
      ["脂肪", "15.0", "g"],
      ["碳水化合物", "60.0", "g"],
    ]);

    const excelFile = new File(["dummy"], "nutrition.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await component.handleUpload({ raw: excelFile });

    expect(component.parseResult).not.toBeNull();
    expect(component.parseResult!.nutritionData.energy).toBe(1600);
    expect(component.parseResult!.nutritionData.protein).toBe(20.5);
  });

  it("N07: 解析后有效营养素数应排除空值和未知字段", async () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    sheet_to_json.mockReturnValue([
      ["能量", "1600", "kJ"],
      ["蛋白质", "20.5", "g"],
      ["脂肪", "15.0", "g"],
      ["", "", ""],
      ["未知字段", "99", "x"],
    ]);

    const excelFile = new File(["dummy"], "nutrition.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await component.handleUpload({ raw: excelFile });

    await wrapper.vm.$nextTick();

    expect(component.validNutrients.length).toBe(3);
    expect(component.validNutrientCount).toBe(3);
  });

  it("N08: 未识别字段被静默忽略，不进入 nutritionData", async () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    sheet_to_json.mockReturnValue([
      ["蛋白质", "20.5", "g"],
      ["自定义指标A", "100", "mg"],
      ["自定义指标B", "50", "g"],
    ]);

    const excelFile = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await component.handleUpload({ raw: excelFile });

    expect(component.parseResult!.nutritionData.protein).toBe(20.5);
    expect(component.parseResult!.nutritionData["自定义指标A"]).toBeUndefined();
    expect(component.unknownFields.length).toBe(0);
  });

  it("N09: 确认导入应 emit import 事件并携带正确数据结构", async () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    sheet_to_json.mockReturnValue([["蛋白质", "20.5", "g"]]);

    const excelFile = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await component.handleUpload({ raw: excelFile });
    await wrapper.vm.$nextTick();

    component.confirmImport();

    const emitted = wrapper.emitted("import");
    expect(emitted).toBeTruthy();
    const data = emitted![0][0] as Record<string, unknown>;
    expect(data).toHaveProperty("nutritionData");
    expect(data).toHaveProperty("dataSource");
    expect(data).toHaveProperty("confidence");
    expect(data).toHaveProperty("notes");
    expect((data.nutritionData as Record<string, number>).protein).toBe(20.5);
  });

  it("N10: 取消导入应重置 parseResult 为 null", async () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    sheet_to_json.mockReturnValue([["蛋白质", "20.5", "g"]]);

    const excelFile = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await component.handleUpload({ raw: excelFile });

    expect(component.parseResult).not.toBeNull();

    component.cancelImport();
    expect(component.parseResult).toBeNull();
  });

  it("N11: 中文标签映射 — 「蛋白质」应映射为 protein key", async () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    sheet_to_json.mockReturnValue([
      ["蛋白质", "25.0", "g"],
      ["脂肪", "10.0", "g"],
      ["维生素C", "5.0", "mg"],
    ]);

    const excelFile = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await component.handleUpload({ raw: excelFile });

    expect(component.parseResult!.nutritionData.protein).toBe(25.0);
    expect(component.parseResult!.nutritionData.fat).toBe(10.0);
    expect(component.parseResult!.nutritionData.vitaminC).toBe(5.0);
  });

  it("N12: dataSource 提取 — 含「数据来源」列应正确提取到 dataSource 字段", async () => {
    const component = wrapper.vm as unknown as NutritionComponentVM;

    sheet_to_json.mockReturnValue([
      ["蛋白质", "20.5", "g"],
      ["数据来源", "中国食物成分表 2024", ""],
    ]);

    const excelFile = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await component.handleUpload({ raw: excelFile });

    expect(component.parseResult!.dataSource).toBe("中国食物成分表 2024");
  });
});
