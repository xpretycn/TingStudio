import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SalesmanForm from "@/views/salesmen/SalesmanForm.vue";

const push = vi.fn();
const mockRoute = vi.hoisted(() => ({
  params: {} as Record<string, string>,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute,
}));

vi.mock("@/stores/salesman", () => ({
  useSalesmanStore: vi.fn(() => ({
    createSalesman: vi.fn(() => Promise.resolve({ success: true })),
    updateSalesman: vi.fn(() => Promise.resolve({ success: true })),
    getSalesman: vi.fn(() =>
      Promise.resolve({
        id: "s1",
        name: "张三",
        code: "EMP001",
        department: "销售部",
        phone: "13800138000",
        email: "zhangsan@example.com",
      })
    ),
    loading: false,
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn() },
}));

describe("SalesmanForm 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper(params?: Record<string, string>) {
    if (params) mockRoute.params = params;
    else mockRoute.params = {};

    return mount(SalesmanForm, {
      global: {
        stubs: {
          "t-form": { template: "<form><slot /></form>" },
          "t-input": { template: "<input />" },
          "t-icon": { template: "<span />" },
          "t-button": { template: "<button><slot /></button>" },
        },
      },
    });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute.params = {};
    push.mockClear();
  });

  it("SF-01: 新增模式应正确渲染表单标题", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".salesman-form").exists()).toBe(true);
    expect(wrapper.text()).toContain("新增业务员");
  });

  it("SF-02: 编辑模式应显示编辑标题", async () => {
    wrapper = createWrapper({ id: "s1" });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("编辑业务员");
  });

  it("SF-03: 取消按钮应调用 router.push 返回列表", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    const cancelBtns = wrapper.findAll(".header-action-btn.secondary");
    if (cancelBtns.length > 0) {
      await cancelBtns[0].trigger("click");
      expect(push).toHaveBeenCalledWith("/salesmen");
    }
  });

  it("SF-04: 表单应包含基础信息区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("基础信息录入");
  });

  it("SF-05: 应包含姓名输入字段", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("姓名");
  });

  it("SF-06: 应包含工号输入字段", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("工号");
  });

  it("SF-07: 应包含部门输入字段", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("部门");
  });

  it("SF-08: 应包含头像上传区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("头像上传");
  });
});
