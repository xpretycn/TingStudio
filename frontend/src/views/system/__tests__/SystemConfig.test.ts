import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SystemConfig from '@/views/system/SystemConfig.vue'

// ─── Hoisted state & mocks (required: vi.mock is hoisted above all imports) ───
const authState = vi.hoisted(() => ({ role: 'admin' as string | null }))
const routeQuery = vi.hoisted(() => ({} as Record<string, string>))
const mockGetConfig = vi.hoisted(() => vi.fn())
const mockUpdateConfig = vi.hoisted(() => vi.fn())
const mockGetDegradation = vi.hoisted(() => vi.fn())
const mockManualCleanup = vi.hoisted(() => vi.fn())
const mockGetRatio = vi.hoisted(() => vi.fn())
const mockUpdateRatio = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: routeQuery, params: {} }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: authState,
    isAuthenticated: true,
  })),
}))

vi.mock('@/api/parseResult', () => ({
  parseResultApi: {
    getConfig: mockGetConfig,
    updateConfig: mockUpdateConfig,
    getDegradation: mockGetDegradation,
    manualCleanup: mockManualCleanup,
  },
}))

vi.mock('@/api/ratioThreshold', () => ({
  ratioThresholdApi: {
    get: mockGetRatio,
    update: mockUpdateRatio,
  },
}))

// ─── Mock tdesign-vue-next (components + MessagePlugin) ───
vi.mock('tdesign-vue-next', () => ({
  MessagePlugin: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  InputNumber: { name: 'InputNumber', template: '<input type="number" class="t-input-number-stub" />' },
  Loading: { name: 'Loading', template: '<span class="t-loading-stub" />' },
  Popconfirm: { name: 'Popconfirm', template: '<div><slot /></div>' },
  Empty: { name: 'Empty', template: '<div class="t-empty-stub">empty</div>' },
  Card: { name: 'Card', template: '<div><slot /></div>' },
  Divider: { name: 'Divider', template: '<hr />' },
}))

// ─── Test fixtures ───
const configFixture = {
  storageLimit: 5000,
  cleanupThresholdPercent: 95,
  cleanupBatchPercent: 5,
  maxFileSizeBytes: 5242880,
}

const degradationFixture = {
  level: 'normal' as const,
  reason: '',
  recommendations: ['建议定期清理缓存'],
  systemStatus: {
    totalCount: 100,
    storageLimit: 5000,
    usagePercent: 45,
    cleanupThreshold: 95,
    isOverThreshold: false,
  },
}

const ratioFixture = {
  normalLow: 0.98,
  normalHigh: 1.02,
  warningLow: 0.95,
  warningHigh: 1.05,
  highWarningLow: 0.92,
  highWarningHigh: 1.08,
  updatedAt: null,
  updatedBy: null,
}

// ─── Factory ───
function createWrapper() {
  return mount(SystemConfig, {
    global: {
      stubs: {
        EnumManage: { template: '<div class="enum-manage-stub">EnumManage</div>' },
        ExportCenter: { template: '<div class="export-center-stub">ExportCenter</div>' },
        PermissionManage: { template: '<div class="permission-manage-stub">PermissionManage</div>' },
        Transition: {
          setup(_: unknown, { slots }: { slots: Record<string, unknown> }) {
            return () => (slots.default as () => unknown)?.()
          },
        },
      },
    },
  })
}

// ─── Tests ───
describe('SystemConfig 组件', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    authState.role = 'admin'
    Object.keys(routeQuery).forEach((k) => delete routeQuery[k])

    vi.clearAllMocks()
    mockGetConfig.mockResolvedValue({ ...configFixture })
    mockGetDegradation.mockResolvedValue({ ...degradationFixture })
    mockGetRatio.mockResolvedValue({ ...ratioFixture })
    mockUpdateConfig.mockResolvedValue({ ...configFixture })
    mockUpdateRatio.mockResolvedValue({ ...ratioFixture })
    mockManualCleanup.mockResolvedValue({ deleted: 10, freedBytes: 1024 })
  })

  // ═══════════════ Cache Config Tab (SC01-SC10) ═══════════════

  it('SC01: 应正确渲染系统管理容器和标题', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.system-config').exists()).toBe(true)
    expect(wrapper.text()).toContain('系统管理')
  })

  it('SC02: onMounted 调用三个初始化 API', async () => {
    createWrapper()
    await flushPromises()
    expect(mockGetConfig).toHaveBeenCalledTimes(1)
    expect(mockGetDegradation).toHaveBeenCalledTimes(1)
    expect(mockGetRatio).toHaveBeenCalledTimes(1)
  })

  it('SC03: 缓存配置值正确渲染', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.text()).toContain('5000')
    expect(wrapper.text()).toContain('95%')
    expect(wrapper.text()).toContain('5%')
    expect(wrapper.text()).toContain('MB')
  })

  it('SC04: admin 点击更改参数进入编辑状态', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.edit-config-btn').exists()).toBe(true)
    await wrapper.find('.edit-config-btn').trigger('click')
    expect(wrapper.find('.cancel-btn').exists()).toBe(true)
    expect(wrapper.find('.save-btn').exists()).toBe(true)
    expect(wrapper.text()).toContain('保存配置')
  })

  it('SC05: admin 编辑后保存配置调用 updateConfig API', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.find('.edit-config-btn').trigger('click')
    wrapper.vm.configForm.storageLimit = 10000
    await wrapper.vm.$nextTick()
    await wrapper.find('.save-btn').trigger('click')
    await flushPromises()
    expect(mockUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ storageLimit: 10000 }),
    )
  })

  it('SC06: 取消编辑恢复原始配置值', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.find('.edit-config-btn').trigger('click')
    wrapper.vm.configForm.storageLimit = 9999
    await wrapper.vm.$nextTick()
    await wrapper.find('.cancel-btn').trigger('click')
    expect(wrapper.vm.isEditing).toBe(false)
    expect(wrapper.vm.configForm.storageLimit).toBe(5000)
  })

  it('SC07: 非 admin 不显示编辑按钮和清理操作按钮', async () => {
    authState.role = 'formulist'
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.edit-config-btn').exists()).toBe(false)
    expect(wrapper.find('.edit-config-bar').exists()).toBe(false)
    expect(wrapper.find('.t-empty-stub').exists()).toBe(true)
  })

  it('SC08: admin 点击模拟清理触发 dryRun', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.find('.dry-run-btn').trigger('click')
    await flushPromises()
    expect(mockManualCleanup).toHaveBeenCalledWith({ dryRun: true })
  })

  it('SC09: 直接调用 triggerCleanup(false) 触发实际清理', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    await (wrapper.vm as any).triggerCleanup(false)
    await flushPromises()
    expect(mockManualCleanup).toHaveBeenCalledWith({ dryRun: false })
  })

  it('SC10: 降级进度条和建议措施渲染正确', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.progress-fill').exists()).toBe(true)
    expect(wrapper.text()).toContain('45%')
    expect(wrapper.text()).toContain('建议定期清理缓存')
  })

  // ═══════════════ Ratio Threshold Tab (SC11-SC16) ═══════════════

  it('SC11: 切换到含量比 tab 显示四个级别卡片', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.activeTab = 'ratio'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ratio-levels-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('正常')
    expect(wrapper.text()).toContain('预警')
    expect(wrapper.text()).toContain('高级预警')
    expect(wrapper.text()).toContain('错误')
  })

  it('SC12: admin 点击含量比更改参数进入编辑', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.activeTab = 'ratio'
    await wrapper.vm.$nextTick()
    const editBtn = wrapper.find('.edit-config-btn')
    await editBtn.trigger('click')
    expect(wrapper.vm.ratioEditing).toBe(true)
  })

  it('SC13: admin 编辑含量比后保存调用 updateRatio API', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.activeTab = 'ratio'
    await wrapper.vm.$nextTick()
    await wrapper.find('.edit-config-btn').trigger('click')
    wrapper.vm.ratioForm.normalLow = 0.90
    await wrapper.vm.$nextTick()
    await wrapper.find('.save-btn').trigger('click')
    await flushPromises()
    expect(mockUpdateRatio).toHaveBeenCalledWith(
      expect.objectContaining({ normalLow: 0.90 }),
    )
  })

  it('SC14: 取消含量比编辑恢复原始值', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.activeTab = 'ratio'
    await wrapper.vm.$nextTick()
    await wrapper.find('.edit-config-btn').trigger('click')
    wrapper.vm.ratioForm.normalLow = 0.50
    await wrapper.vm.$nextTick()
    await wrapper.find('.cancel-btn').trigger('click')
    expect(wrapper.vm.ratioEditing).toBe(false)
    expect(wrapper.vm.ratioForm.normalLow).toBe(0.98)
  })

  it('SC15: 缓存配置未修改时保存按钮 disabled', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.find('.edit-config-btn').trigger('click')
    expect(wrapper.find('.save-btn').attributes('disabled')).toBeDefined()
    wrapper.vm.configForm.storageLimit = 8000
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.save-btn').attributes('disabled')).toBeUndefined()
  })

  it('SC16: 含量比未修改时保存按钮 disabled', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.activeTab = 'ratio'
    await wrapper.vm.$nextTick()
    await wrapper.find('.edit-config-btn').trigger('click')
    expect(wrapper.find('.save-btn').attributes('disabled')).toBeDefined()
    wrapper.vm.ratioForm.normalLow = 0.85
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.save-btn').attributes('disabled')).toBeUndefined()
  })

  // ═══════════════ Enum / Export Tabs (SC17-SC18) ═══════════════

  it('SC17: 切换到原料枚举值 tab 渲染 EnumManage 组件', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.activeTab = 'enum-manage'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.enum-manage-stub').exists()).toBe(true)
  })

  it('SC18: 切换到导出中心 tab 渲染 ExportCenter 组件', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.activeTab = 'export-center'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.export-center-stub').exists()).toBe(true)
  })

  // ═══════════════ Permission Tab (SC19-SC20) ═══════════════

  it('SC19: admin 看到 5 个 tab 包括权限管理', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    const tabs = wrapper.findAll('.nav-tab')
    expect(tabs.length).toBe(5)
    expect(wrapper.text()).toContain('权限管理')
  })

  it('SC20: 非 admin 只能看到 4 个 tab 不包括权限管理', async () => {
    authState.role = 'formulist'
    const wrapper = createWrapper()
    await flushPromises()
    const tabs = wrapper.findAll('.nav-tab')
    expect(tabs.length).toBe(4)
    expect(wrapper.text()).not.toContain('权限管理')
  })

  // ═══════════════ Navigation & Route (SC21-SC22) ═══════════════

  it('SC21: 点击折叠按钮切换导航折叠状态', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('.mm-nav--collapsed').exists()).toBe(false)
    await wrapper.find('.nav-collapse-btn').trigger('click')
    expect(wrapper.find('.mm-nav--collapsed').exists()).toBe(true)
    await wrapper.find('.nav-collapse-btn').trigger('click')
    expect(wrapper.find('.mm-nav--collapsed').exists()).toBe(false)
  })

  it('SC22: 路由 query tab 参数激活对应 Tab', async () => {
    routeQuery.tab = 'export-center'
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.vm.activeTab).toBe('export-center')
    expect(wrapper.find('.export-center-stub').exists()).toBe(true)
  })
})
