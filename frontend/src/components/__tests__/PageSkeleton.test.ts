import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PageSkeleton from "@/components/Skeleton/PageSkeleton.vue";

describe("PageSkeleton 组件", () => {
  it("PS01: 默认 type=table 应渲染表格骨架", () => {
    const wrapper = mount(PageSkeleton);
    expect(wrapper.find(".skeleton-table").exists()).toBe(true);
    expect(wrapper.find(".skeleton-toolbar").exists()).toBe(true);
  });

  it("PS02: table 模式下应有 columns 个表头和 rows 行数据", () => {
    const wrapper = mount(PageSkeleton, { props: { columns: 4, rows: 3 } });
    const headers = wrapper.findAll(".skeleton-th");
    const dataRows = wrapper.findAll(".skeleton-table-row");
    expect(headers.length).toBe(4);
    expect(dataRows.length).toBe(3);
  });

  it("PS03: type=cards 应渲染卡片网格骨架", () => {
    const wrapper = mount(PageSkeleton, { props: { type: "cards" } });
    expect(wrapper.find(".skeleton-cards").exists()).toBe(true);
    expect(wrapper.find(".skeleton-card").exists()).toBe(true);
  });

  it("PS04: cards 模式下行数应等于 rows prop", () => {
    const wrapper = mount(PageSkeleton, { props: { type: "cards", rows: 6 } });
    const cards = wrapper.findAll(".skeleton-card");
    expect(cards.length).toBe(6);
  });

  it("PS05: type=detail 应渲染详情页骨架", () => {
    const wrapper = mount(PageSkeleton, { props: { type: "detail" } });
    expect(wrapper.find(".skeleton-detail-card").exists()).toBe(true);
    expect(wrapper.find(".skeleton-detail-header").exists()).toBe(true);
    expect(wrapper.find(".skeleton-desc-grid").exists()).toBe(true);
  });

  it("PS06: detail 模式描述网格应有 8 个条目", () => {
    const wrapper = mount(PageSkeleton, { props: { type: "detail" } });
    const items = wrapper.findAll(".skeleton-desc-item");
    expect(items.length).toBe(8);
  });

  it("PS07: detail 模式表格区域应有 6 行数据行", () => {
    const wrapper = mount(PageSkeleton, { props: { type: "detail" } });
    const detailRows = wrapper.findAll(".skeleton-table-row");
    expect(detailRows.length).toBe(6);
  });

  it("PS08: 切换 type 后只渲染对应类型的骨架", async () => {
    const wrapper = mount(PageSkeleton, { props: { type: "table" } });
    expect(wrapper.find(".skeleton-cards").exists()).toBe(false);

    await wrapper.setProps({ type: "cards" });
    expect(wrapper.find(".skeleton-cards").exists()).toBe(true);
    expect(wrapper.find(".skeleton-detail-card").exists()).toBe(false);
  });
});
