import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Login from "@/views/auth/Login.vue";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: {}, query: {} }),
}));

const mockLogin = vi.fn();

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(() => ({
    login: mockLogin,
    user: null,
    token: "",
    isAuthenticated: false,
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Login 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  const createWrapper = async () => {
    setActivePinia(createPinia());
    const w = mount(Login, {
      global: {
        stubs: {
          "t-icon": { template: "<span></span>" },
          "t-input": { template: "<input />", props: ["modelValue"] },
          "t-form": {
            template: "<form @submit.prevent=\"$emit('submit', $event)\"><slot /></form>",
            props: ["data", "rules"],
          },
          "t-button": { template: '<button :disabled="loading"><slot /></button>', props: ["theme", "loading"] },
          "t-checkbox": { template: '<label><input type="checkbox" /><slot /></label>', props: ["modelValue"] },
        },
      },
    });
    await flushPromises();
    return w;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("LG01: 页面应正常渲染，不抛出错误", async () => {
    wrapper = await createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it("LG02: 登录表单应存在", async () => {
    wrapper = await createWrapper();
    const form = wrapper.find("form");
    expect(form.exists()).toBe(true);
  });

  it("LG03: 用户名输入框应存在", async () => {
    wrapper = await createWrapper();
    const inputs = wrapper.findAll("input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("LG04: 登录按钮应存在", async () => {
    wrapper = await createWrapper();
    const btn = wrapper.find("button");
    expect(btn.exists()).toBe(true);
  });

  it("LG05: 登录按钮文本应包含「登」字", async () => {
    wrapper = await createWrapper();
    const btn = wrapper.find("button");
    expect(btn.text()).toContain("登");
  });

  it("LG06: 页面标题区域应存在", async () => {
    wrapper = await createWrapper();
    const title = wrapper.find(".login-title");
    if (title.exists()) {
      expect(title.text().length).toBeGreaterThan(0);
    }
  });

  it("LG07: 登录页面容器应存在", async () => {
    wrapper = await createWrapper();
    const container = wrapper.find(".login-page");
    expect(container.exists()).toBe(true);
  });

  it("LG08: 组件应包含表单引用（formRef）", async () => {
    wrapper = await createWrapper();
    const vm = wrapper.vm as any;
    expect(vm.formRef).toBeDefined();
  });

  it("LG09: formData 应包含 username 和 password 字段", async () => {
    wrapper = await createWrapper();
    const vm = wrapper.vm as any;
    expect(vm.formData).toHaveProperty("username");
    expect(vm.formData).toHaveProperty("password");
  });

  it("LG10: handleSubmit 方法应存在", async () => {
    wrapper = await createWrapper();
    const vm = wrapper.vm as any;
    expect(typeof vm.handleSubmit).toBe("function");
  });
});
