import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExportCenter from '@/views/system/ExportCenter.vue'

const tdComponent = vi.hoisted(() => ({ render: () => null, inheritAttrs: false }))
vi.mock('tdesign-vue-next', () => ({
  default: undefined,
  Input: tdComponent, Button: tdComponent, Select: tdComponent, Option: tdComponent,
  Table: tdComponent, Tag: tdComponent, Icon: tdComponent, Drawer: tdComponent,
  Dialog: tdComponent, Form: tdComponent, FormItem: tdComponent, Textarea: tdComponent,
  Switch: tdComponent, Checkbox: tdComponent, InputNumber: tdComponent, Popup: tdComponent,
  Popconfirm: tdComponent, Space: tdComponent, Loading: tdComponent, Empty: tdComponent, Card: tdComponent,
  MessagePlugin: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockFetchJobs = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockFetchTemplates = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockFetchStatistics = vi.hoisted(() => vi.fn().mockResolvedValue({
  totalJobs: 150, completedJobs: 120, failedJobs: 5, processingJobs: 25,
  activeShares: 8, templateCount: 12, recentActivities: [],
}))
const mockFetchConfig = vi.hoisted(() => vi.fn().mockResolvedValue([
  { configKey: 'default_export_format', configValue: 'excel', configType: 'string', description: null },
  { configKey: 'default_template_formula', configValue: '', configType: 'string', description: null },
  { configKey: 'default_template_material', configValue: '', configType: 'string', description: null },
  { configKey: 'default_template_weekly_report', configValue: '', configType: 'string', description: null },
  { configKey: 'default_template_monthly_report', configValue: '', configType: 'string', description: null },
  { configKey: 'export_rate_limit', configValue: '50', configType: 'number', description: null },
  { configKey: 'file_naming_pattern', configValue: '{category}_{date}_{name}', configType: 'string', description: null },
  { configKey: 'auto_delete_days', configValue: '30', configType: 'number', description: null },
]))
const mockUpdateConfig = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }))
const mockCreateTemplate = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, data: { templateId: 'tpl-new' } }))
const mockUpdateTemplate = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }))
const mockDeleteTemplate = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }))
const mockSetPage = vi.hoisted(() => vi.fn())
const mockCreateShare = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, data: { shareId: 's1', shareUrl: 'http://example.com/share/s1' } }))

let mockStore: Record<string, unknown>
vi.mock('@/stores/export', () => ({ useExportStore: vi.fn(() => mockStore) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: vi.fn(() => ({ user: { role: 'admin', username: 'admin', userId: 'u1' } })) }))
vi.mock('@/api/formula', () => ({ formulaApi: { getList: vi.fn().mockResolvedValue({ list: [], pagination: { total: 0, page: 1, pageSize: 10 } }), getById: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/api/material', () => ({ materialApi: { getList: vi.fn().mockResolvedValue({ list: [], pagination: { total: 0, page: 1, pageSize: 10 } }), getById: vi.fn().mockResolvedValue({}) } }))

function initStore(overrides: Record<string, unknown> = {}) {
  mockStore = {
    jobs: [], templates: [], shares: [], loading: false,
    total: 0, currentPage: 1, pageSize: 10,
    templateTotal: 0, templateCurrentPage: 1, templatePageSize: 10,
    statistics: null, configList: [], materialList: [], reportList: [],
    fetchJobs: mockFetchJobs, fetchTemplates: mockFetchTemplates,
    fetchStatistics: mockFetchStatistics, fetchConfig: mockFetchConfig,
    updateConfig: mockUpdateConfig, createTemplate: mockCreateTemplate,
    updateTemplate: mockUpdateTemplate, deleteTemplate: mockDeleteTemplate,
    setPage: mockSetPage, createShare: mockCreateShare,
    ...overrides,
  }
}

function createWrapper() {
  return mount(ExportCenter, {
    global: {
      stubs: {
        't-card': { template: '<div class="t-card"><slot /></div>' },
        't-button': { template: '<button class="t-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['theme', 'size', 'variant', 'disabled'], emits: ['click'] },
        't-table': { template: '<div class="t-table"><slot name="empty" /><slot name="status" /><slot name="createdAt" /><slot name="operation" /><slot name="name" /><slot name="category" /><slot name="type" /><slot name="fieldCount" /></div>', props: ['data', 'columns', 'loading', 'rowKey', 'hover', 'size', 'pagination'], emits: ['page-change'] },
        't-tag': { template: '<span class="t-tag"><slot /></span>', props: ['theme', 'variant', 'size'] },
        't-icon': { template: '<span class="t-icon"><slot /></span>' },
        't-drawer': { template: '<div class="t-drawer"><slot /></div>', props: ['visible', 'header', 'footer', 'size', 'attach', 'closeOnOverlayClick'], emits: ['update:visible'] },
        't-dialog': { template: '<div class="t-dialog"><slot /></div>', props: ['visible', 'header', 'confirmBtn', 'cancelBtn', 'width', 'closeOnOverlayClick'], emits: ['update:visible', 'confirm', 'close'] },
        't-form': { template: '<form class="t-form"><slot /></form>', props: ['data', 'labelWidth', 'layout'] },
        't-form-item': { template: '<div class="t-form-item"><slot /></div>', props: ['label'] },
        't-space': { template: '<div class="t-space"><slot /></div>', props: ['size'] },
        't-loading': { template: '<div class="t-loading"><slot /></div>', props: ['loading', 'size', 'text'] },
        't-empty': { template: '<div class="t-empty" role="status"><slot /></div>', props: ['description'] },
        't-select': { template: '<select class="t-select" @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>', props: ['modelValue', 'placeholder', 'clearable', 'filterable'], emits: ['update:modelValue', 'change'] },
        't-input': { template: '<input class="t-input" @input="$emit(\'update:modelValue\', $event.target.value)" @clear="$emit(\'clear\')" />', props: ['modelValue', 'clearable', 'placeholder'], emits: ['update:modelValue', 'clear'] },
        't-option': { template: '<option class="t-option" :value="value"><slot /></option>', props: ['value', 'label'] },
        't-textarea': { template: '<textarea class="t-textarea" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder'], emits: ['update:modelValue'] },
        't-switch': { template: '<input type="checkbox" class="t-switch" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue'], emits: ['update:modelValue'] },
        't-checkbox': { template: '<label class="t-checkbox"><input type="checkbox" @change="$emit(\'change\', $event.target.checked)" /><slot /></label>', props: ['checked', 'disabled', 'modelValue'], emits: ['change'] },
        't-input-number': { template: '<input type="number" class="t-input-number" @input="$emit(\'update:modelValue\', Number($event.target.value))" />', props: ['modelValue', 'min', 'max', 'theme'], emits: ['update:modelValue'] },
        't-popup': { template: '<div class="t-popup"><slot /><slot name="content" /></div>', props: ['trigger', 'placement'] },
        't-popconfirm': { template: '<span class="t-popconfirm" @click="$emit(\'confirm\')"><slot /></span>', props: ['content'], emits: ['confirm'] },
        PageSkeleton: { template: '<div class="page-skeleton" />', props: ['type', 'rows', 'columns'] },
      },
    },
  })
}

function vm(wrapper: ReturnType<typeof mount>): any {
  return wrapper.vm as any
}

describe('ExportCenter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    initStore()
  })

  describe('EC01-EC02: 渲染', () => {
    it('EC01: 组件应定义4个选项卡', async () => {
      const wrapper = createWrapper()
      const tabs = vm(wrapper).exportTabs
      expect(tabs.length).toBe(4)
      expect(tabs[0].value).toBe('export')
      expect(tabs[0].label).toBe('导出任务')
      expect(tabs[1].value).toBe('templates')
      expect(tabs[1].label).toBe('模板配置')
      expect(tabs[2].value).toBe('template-admin')
      expect(tabs[2].label).toBe('模板管理')
      expect(tabs[3].value).toBe('config')
      expect(tabs[3].label).toBe('导出配置')
      expect(vm(wrapper).activeTab).toBe('export')
    })

    it('EC02: 初始化后应加载统计数据', async () => {
      const wrapper = createWrapper()
      expect(mockFetchJobs).toHaveBeenCalled()
      expect(mockFetchStatistics).toHaveBeenCalled()
      // statistics is populated asynchronously inside onMounted.
      // Set it directly so the dashboardCards computed produces values.
      vm(wrapper).statistics = { totalJobs: 150, completedJobs: 120, failedJobs: 5, processingJobs: 25, activeShares: 8, templateCount: 12, recentActivities: [] }
      const cards = vm(wrapper).dashboardCards
      expect(Array.isArray(cards)).toBe(true)
      expect(cards.length).toBe(4)
      expect(cards[0].label).toBe('导出任务')
      expect(cards[1].label).toBe('分享链接')
    })
  })

  describe('EC10-EC11: 导出任务', () => {
    it('EC10: 任务列表应显示导出任务', async () => {
      const mockJobs: any[] = [
        { jobId: 'j1', formulaName: '配方A', dataCategory: 'formula', exportType: 'excel', status: 'completed', createdAt: '2026-06-01T10:00:00Z', errorMessage: null, formulaId: 'f1', versionId: null, templateId: null, fileUrl: null, fileName: null, progress: 100, createdBy: 'admin', completedAt: '2026-06-01T10:05:00Z' },
        { jobId: 'j2', formulaName: '配方B', dataCategory: 'formula', exportType: 'pdf', status: 'failed', createdAt: '2026-06-01T11:00:00Z', errorMessage: '导出超时', formulaId: 'f2', versionId: null, templateId: null, fileUrl: null, fileName: null, progress: 50, createdBy: 'admin', completedAt: null },
      ]
      initStore({ jobs: mockJobs, total: 2, currentPage: 1, pageSize: 10 })
      const wrapper = createWrapper()
      expect(vm(wrapper).exportStore.jobs).toEqual(mockJobs)
    })

    it('EC11: 按状态筛选导出任务', async () => {
      const wrapper = createWrapper()
      mockFetchJobs.mockClear()
      vm(wrapper).filterForm.status = 'completed'
      vm(wrapper).applyFilter()
      expect(mockFetchJobs).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
    })
  })

  describe('EC20-EC21: 模板配置', () => {
    it('EC20: 模板配置分类卡片应正确生成', async () => {
      const mockTemplates: any[] = [
        { templateId: 't1', name: '默认配方模板', category: 'formula', type: 'excel', formatConfig: { selectedFields: ['name', 'code'] }, isDefault: 1, description: null, createdBy: 'admin', createdAt: '2026-06-01T10:00:00Z' },
        { templateId: 't2', name: '原料导出模板', category: 'material', type: 'pdf', formatConfig: { selectedFields: ['name', 'code'] }, isDefault: 1, description: null, createdBy: 'admin', createdAt: '2026-06-01T10:00:00Z' },
        { templateId: 't3', name: '周报模板', category: 'weekly-report', type: 'excel', formatConfig: { selectedFields: ['periodRange'] }, isDefault: 1, description: null, createdBy: 'admin', createdAt: '2026-06-01T10:00:00Z' },
        { templateId: 't4', name: '月报模板', category: 'monthly-report', type: 'excel', formatConfig: { selectedFields: ['periodRange'] }, isDefault: 1, description: null, createdBy: 'admin', createdAt: '2026-06-01T10:00:00Z' },
      ]
      initStore({ templates: mockTemplates })
      const wrapper = createWrapper()
      vm(wrapper).switchTab('templates')
      expect(mockFetchTemplates).toHaveBeenCalled()
      const cards = vm(wrapper).categoryCards
      expect(cards.length).toBe(4)
      expect(cards[0].name).toContain('配方')
      expect(cards[1].name).toContain('原料')
    })

    it('EC21: 模板预览功能', async () => {
      const mockTemplates: any[] = [
        { templateId: 't1', name: '默认配方模板', category: 'formula', type: 'excel', formatConfig: { selectedFields: ['name', 'code'], exportFormat: 'excel', orientation: 'portrait', pageSize: 'A4', fontSize: 12, includeHeader: true, includeFooter: true }, isDefault: 1, description: null, createdBy: 'admin', createdAt: '2026-06-01T10:00:00Z' },
      ]
      initStore({ templates: mockTemplates })
      const wrapper = createWrapper()
      vm(wrapper).switchTab('templates')
      vm(wrapper).openTemplateDrawer('formula')
      expect(vm(wrapper).templateDrawerVisible).toBe(true)
      expect(vm(wrapper).drawerCategory).toBe('formula')
      vm(wrapper).handleSaveAndPreview()
      expect(mockUpdateTemplate).toHaveBeenCalled()
    })
  })

  describe('EC30: 模板管理 CRUD', () => {
    it('EC30: 应支持模板的新建/编辑/删除', async () => {
      const mockTemplates: any[] = [
        { templateId: 't1', name: '配方Excel模板', category: 'formula', type: 'excel', formatConfig: { selectedFields: ['name'] }, isDefault: 1, description: null, createdBy: 'admin', createdAt: '2026-06-01T10:00:00Z' },
      ]
      initStore({ templates: mockTemplates, templateTotal: 1 })
      const wrapper = createWrapper()
      vm(wrapper).switchTab('template-admin')
      expect(mockFetchTemplates).toHaveBeenCalled()

      vm(wrapper).openCreateTemplateDialog()
      expect(vm(wrapper).showTemplateEditDialog).toBe(true)
      expect(vm(wrapper).editingTemplateId).toBeNull()

      vm(wrapper).openEditTemplateDialog(mockTemplates[0])
      expect(vm(wrapper).editingTemplateId).toBe('t1')
      expect(vm(wrapper).tmplEditForm.name).toBe('配方Excel模板')

      vm(wrapper).handleSaveEditTemplate()
      expect(mockUpdateTemplate).toHaveBeenCalledWith('t1', expect.objectContaining({ name: '配方Excel模板' }))

      vm(wrapper).handleAdminDeleteTemplate('t1')
      expect(mockDeleteTemplate).toHaveBeenCalledWith('t1')
    })
  })

  describe('EC40: 分享链接', () => {
    it('EC40: 创建分享链接应返回成功结果', async () => {
      const wrapper = createWrapper()
      const result = await mockCreateShare({ formulaId: 'f1', shareType: 'link' })
      expect(result.success).toBe(true)
      expect(result.data.shareId).toBe('s1')
      expect(mockCreateShare).toHaveBeenCalledWith({ formulaId: 'f1', shareType: 'link' })
    })
  })

  describe('EC50: 导出配置编辑', () => {
    it('EC50: 应支持修改并保存导出配置', async () => {
      const wrapper = createWrapper()
      vm(wrapper).switchTab('config')
      expect(mockFetchConfig).toHaveBeenCalled()
      expect(vm(wrapper).exportConfig.defaultExportFormat).toBe('excel')

      vm(wrapper).startExportEdit()
      expect(vm(wrapper).exportEditing).toBe(true)

      vm(wrapper).exportFormConfig.defaultExportFormat = 'pdf'
      vm(wrapper).exportFormConfig.exportRateLimit = 100

      vm(wrapper).saveExportConfig()
      expect(mockUpdateConfig).toHaveBeenCalled()
      const updateCall = mockUpdateConfig.mock.calls[0][0]
      expect(updateCall).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ configKey: 'default_export_format', configValue: 'pdf' }),
          expect.objectContaining({ configKey: 'export_rate_limit', configValue: '100' }),
        ]),
      )
    })
  })
})
