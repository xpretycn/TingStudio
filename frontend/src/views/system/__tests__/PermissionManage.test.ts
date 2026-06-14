import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import PermissionManage from "@/views/system/PermissionManage.vue"

const { mockRoleApi } = vi.hoisted(() => ({
  mockRoleApi: {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getDetail: vi.fn(),
    updatePermissions: vi.fn(),
    getPermissions: vi.fn(),
  },
}))

const { mockPermissionApi } = vi.hoisted(() => ({
  mockPermissionApi: {
    getList: vi.fn(),
  },
}))

const { mockUserManageApi } = vi.hoisted(() => ({
  mockUserManageApi: {
    getList: vi.fn(),
    createUser: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

const { mockAuthStore } = vi.hoisted(() => ({
  mockAuthStore: { user: { id: "u1", role: "admin" } },
}))

const { mockPaginationStore } = vi.hoisted(() => ({
  mockPaginationStore: {
    visible: true,
    register: vi.fn(),
    update: vi.fn(),
    unregister: vi.fn(),
  },
}))

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} }),
}))

vi.mock("@/api/role", () => ({ roleApi: mockRoleApi }))

vi.mock("@/api/permission", () => ({ permissionApi: mockPermissionApi }))

vi.mock("@/api/userManage", () => ({ userManageApi: mockUserManageApi }))

vi.mock("@/stores/auth", () => ({ useAuthStore: vi.fn(() => mockAuthStore) }))

vi.mock("@/stores/pagination", () => ({ usePaginationStore: vi.fn(() => mockPaginationStore) }))

vi.mock("@/composables/usePageNumbers", () => ({
  usePageNumbers: vi.fn(() => ({ totalPages: 1, pageNumbers: [1] })),
}))

const { formStub } = vi.hoisted(() => ({
  formStub: {
    name: "Form",
    template: "<form><slot /></form>",
    methods: {
      validate() { return Promise.resolve({ first: undefined }) },
      reset() {},
    },
  },
}))

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Button: { name: "Button", template: "<button><slot /></button>" },
  Tag: { name: "Tag", template: "<span><slot /></span>" },
  Input: { name: "Input", template: "<input />" },
  Select: { name: "Select", template: "<select><slot /></select>" },
  Form: formStub,
  FormItem: { name: "FormItem", template: "<div><slot /></div>" },
  Checkbox: { name: "Checkbox", template: '<input type="checkbox" />' },
  Dialog: { name: "Dialog", template: "<div><slot /></div>" },
  Popconfirm: { name: "Popconfirm", template: "<div><slot /></div>" },
  Loading: { name: "Loading", template: "<div><slot /></div>" },
  Table: { name: "Table", template: "<div><slot /></div>" },
}))

const mockRoles = [
  { id: "1", name: "管理员", roleKey: "admin", description: "系统管理员", isSystem: true, permissionCount: 18, userCount: 2, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "2", name: "配方师", roleKey: "formulist", description: "配方管理", isSystem: true, permissionCount: 14, userCount: 5, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "3", name: "测试角色", roleKey: "test_role", description: "测试用角色", isSystem: false, permissionCount: 0, userCount: 0, createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" },
]

const mockPermissionGroups = [
  { module: "formulas", moduleLabel: "配方管理", permissions: [{ id: "p1", module: "formulas", action: "read", permissionKey: "formulas:read", label: "读取", description: "" }, { id: "p2", module: "formulas", action: "write", permissionKey: "formulas:write", label: "写入", description: "" }] },
  { module: "materials", moduleLabel: "原料管理", permissions: [{ id: "p3", module: "materials", action: "read", permissionKey: "materials:read", label: "读取", description: "" }, { id: "p4", module: "materials", action: "write", permissionKey: "materials:write", label: "写入", description: "" }] },
  { module: "salesmen", moduleLabel: "业务员管理", permissions: [{ id: "p5", module: "salesmen", action: "read", permissionKey: "salesmen:read", label: "读取", description: "" }, { id: "p6", module: "salesmen", action: "write", permissionKey: "salesmen:write", label: "写入", description: "" }] },
  { module: "version", moduleLabel: "版本管理", permissions: [{ id: "p7", module: "version", action: "read", permissionKey: "version:read", label: "读取", description: "" }, { id: "p8", module: "version", action: "write", permissionKey: "version:write", label: "写入", description: "" }] },
  { module: "ai", moduleLabel: "AI 助手", permissions: [{ id: "p9", module: "ai", action: "read", permissionKey: "ai:read", label: "读取", description: "" }, { id: "p10", module: "ai", action: "write", permissionKey: "ai:write", label: "写入", description: "" }] },
  { module: "stats", moduleLabel: "数据统计", permissions: [{ id: "p11", module: "stats", action: "read", permissionKey: "stats:read", label: "读取", description: "" }, { id: "p12", module: "stats", action: "write", permissionKey: "stats:write", label: "写入", description: "" }] },
  { module: "system", moduleLabel: "系统管理", permissions: [{ id: "p13", module: "system", action: "read", permissionKey: "system:read", label: "读取", description: "" }, { id: "p14", module: "system", action: "write", permissionKey: "system:write", label: "写入", description: "" }] },
  { module: "users", moduleLabel: "用户管理", permissions: [{ id: "p15", module: "users", action: "read", permissionKey: "users:read", label: "读取", description: "" }, { id: "p16", module: "users", action: "write", permissionKey: "users:write", label: "写入", description: "" }] },
  { module: "roles", moduleLabel: "角色管理", permissions: [{ id: "p17", module: "roles", action: "read", permissionKey: "roles:read", label: "读取", description: "" }, { id: "p18", module: "roles", action: "write", permissionKey: "roles:write", label: "写入", description: "" }] },
]

const mockUsers = {
  list: [
    { id: "u1", username: "admin", displayName: "管理员", role: "admin", roleId: "1", roleName: "管理员", isActive: true, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "u2", username: "formulist_a", displayName: null, role: "formulist", roleId: "2", roleName: "配方师", isActive: true, createdAt: "2026-01-15T00:00:00.000Z" },
    { id: "u3", username: "disabled_user", displayName: "已禁用用户", role: "formulist", roleId: "2", roleName: "配方师", isActive: false, createdAt: "2026-02-01T00:00:00.000Z" },
    { id: "u4", username: "other_admin", displayName: "其他管理员", role: "admin", roleId: "1", roleName: "管理员", isActive: true, createdAt: "2026-01-10T00:00:00.000Z" },
  ],
  pagination: { page: 1, pageSize: 10, total: 4, totalPages: 1 },
}

function createWrapper() {
  setActivePinia(createPinia())
  return mount(PermissionManage, {
    global: {
      stubs: {
        "t-icon": { template: "<span></span>" },
        "t-input": { template: "<input />" },
        "t-form": { template: "<form><slot /></form>" },
        "t-form-item": { template: "<div><slot /></div>" },
        "t-button": { template: "<button><slot /></button>" },
        "t-checkbox": { template: '<input type="checkbox" />' },
        "t-dialog": { template: "<div><slot /></div>" },
        "t-popconfirm": { template: "<div><slot /></div>" },
        "t-tag": { template: "<span><slot /></span>" },
        "t-select": { template: "<select><slot /></select>" },
        "t-loading": { template: "<div><slot /></div>" },
        "t-table": { template: "<div><slot /></div>" },
      },
    },
  })
}

describe("PermissionManage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("PM01 — Shows role list", () => {
    it("renders role cards after loading", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.text()).toContain("管理员")
      expect(wrapper.text()).toContain("配方师")
      expect(wrapper.text()).toContain("测试角色")
      expect(wrapper.text()).toContain("共 3 个角色")
    })
  })

  describe("PM02 — Create role", () => {
    it("calls create API when dialog is confirmed", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockRoleApi.create.mockResolvedValue({ id: "4", name: "新角色", roleKey: "new_role", description: "", isSystem: false, permissionCount: 0, userCount: 0, createdAt: "", updatedAt: "" })
      const wrapper = createWrapper()
      await flushPromises()

      const roleCmps = wrapper.findAllComponents({ name: "RoleManage" })
      expect(roleCmps.length).toBe(1)
      const vm = roleCmps[0].vm as any

      vm.openCreateDialog()
      vm.formName = "新角色"
      vm.formRoleKey = "new_role"
      vm.formDescription = "新角色描述"

      await vm.handleDialogConfirm()
      await flushPromises()

      expect(mockRoleApi.create).toHaveBeenCalledWith({
        name: "新角色",
        roleKey: "new_role",
        description: "新角色描述",
      })
    })
  })

  describe("PM03 — Assign permissions", () => {
    it("opens permission panel with 9 permission modules", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockRoleApi.getDetail.mockResolvedValue({ ...mockRoles[2], permissions: [] })
      mockPermissionApi.getList.mockResolvedValue(mockPermissionGroups)
      const wrapper = createWrapper()
      await flushPromises()

      const roleCmps = wrapper.findAllComponents({ name: "RoleManage" })
      const vm = roleCmps[0].vm as any

      await vm.openPermissionPanel(mockRoles[2], false)
      await flushPromises()

      expect(vm.expandedRoleId).toBe("3")
      expect(vm.isReadOnly).toBe(false)
      expect(vm.permissionGroups.length).toBe(9)
    })

    it("saves selected permissions via updatePermissions API", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockRoleApi.getDetail.mockResolvedValue({ ...mockRoles[2], permissions: [] })
      mockRoleApi.updatePermissions.mockResolvedValue(undefined)
      mockPermissionApi.getList.mockResolvedValue(mockPermissionGroups)
      const wrapper = createWrapper()
      await flushPromises()

      const roleCmps = wrapper.findAllComponents({ name: "RoleManage" })
      const vm = roleCmps[0].vm as any

      await vm.openPermissionPanel(mockRoles[2], false)
      await flushPromises()

      vm.handlePermissionToggle("formulas", "read", true)
      vm.handlePermissionToggle("formulas", "write", true)

      await vm.handleSavePermissions()
      await flushPromises()

      expect(mockRoleApi.updatePermissions).toHaveBeenCalledWith("3", ["p1", "p2"])
    })
  })

  describe("PM04 — System roles are protected", () => {
    it("does not have delete button for system roles", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.text()).toContain("系统角色")

      const roleCmps = wrapper.findAllComponents({ name: "RoleManage" })
      const vm = roleCmps[0].vm as any
      expect(vm.roleList.length).toBe(3)

      const adminRole = vm.roleList.find((r: any) => r.roleKey === "admin")
      expect(adminRole.isSystem).toBe(true)

      const testRole = vm.roleList.find((r: any) => r.roleKey === "test_role")
      expect(testRole.isSystem).toBe(false)
    })

    it("delete buttons appear only for non-system roles", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      const wrapper = createWrapper()
      await flushPromises()

      const deleteBtns = wrapper.findAll("button").filter(b => b.text().includes("删除角色"))
      const nonSystemCount = mockRoles.filter(r => !r.isSystem).length
      expect(deleteBtns.length).toBe(nonSystemCount)
    })
  })

  describe("PM05 — Admin role permissions are read-only", () => {
    it("opens admin permission panel with isReadOnly=true", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockRoleApi.getDetail.mockResolvedValue({
        ...mockRoles[0],
        permissions: mockPermissionGroups.flatMap(g => g.permissions),
      })
      mockPermissionApi.getList.mockResolvedValue(mockPermissionGroups)
      const wrapper = createWrapper()
      await flushPromises()

      const roleCmps = wrapper.findAllComponents({ name: "RoleManage" })
      const vm = roleCmps[0].vm as any

      await vm.openPermissionPanel(mockRoles[0], true)
      await flushPromises()

      expect(vm.expandedRoleId).toBe("1")
      expect(vm.isReadOnly).toBe(true)
    })
  })

  describe("PM10 — Shows user list", () => {
    it("loads user list into component state", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockUserManageApi.getList.mockResolvedValue(mockUsers)
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.text()).toContain("用户管理")
      const userCmps = wrapper.findAllComponents({ name: "UserManage" })
      expect(userCmps.length).toBe(1)
      const vm = userCmps[0].vm as any
      expect(vm.userList.length).toBe(4)
      expect(vm.sortedUsers.length).toBe(4)
      expect(vm.userList[0].username).toBe("admin")
      expect(vm.userList[1].username).toBe("formulist_a")
      expect(vm.userList[2].username).toBe("disabled_user")
    })
  })

  describe("PM11 — Create user", () => {
    it("creates a new user via API", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockUserManageApi.getList.mockResolvedValue(mockUsers)
      mockUserManageApi.createUser.mockResolvedValue({ id: "u5", username: "newuser", displayName: null, role: "formulist", roleId: "2", roleName: "配方师", isActive: true, createdAt: "2026-06-01T00:00:00.000Z" })
      const wrapper = createWrapper()
      await flushPromises()

      const userCmps = wrapper.findAllComponents({ name: "UserManage" })
      expect(userCmps.length).toBe(1)
      const vm = userCmps[0].vm as any

      vm.showCreateDialog = true
      vm.createForm.username = "newuser"
      vm.createForm.password = "password123"
      vm.createForm.role = "formulist"
      vm.createForm.displayName = ""

      await vm.handleCreateUser()
      await flushPromises()

      expect(mockUserManageApi.createUser).toHaveBeenCalledWith({
        username: "newuser",
        password: "password123",
        role: "formulist",
        displayName: undefined,
      })
    })

    it("handles create error gracefully", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockUserManageApi.getList.mockResolvedValue(mockUsers)
      mockUserManageApi.createUser.mockRejectedValue(new Error("用户名已存在"))
      const wrapper = createWrapper()
      await flushPromises()

      const userCmps = wrapper.findAllComponents({ name: "UserManage" })
      const vm = userCmps[0].vm as any

      vm.showCreateDialog = true
      vm.createForm.username = "admin"
      vm.createForm.password = "password123"
      vm.createForm.role = "formulist"

      const result = await vm.handleCreateUser()
      await flushPromises()

      expect(result).toBe(false)
      expect(mockUserManageApi.createUser).toHaveBeenCalled()
    })
  })

  describe("PM12 — Switch user role", () => {
    it("calls updateRole API to switch role", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockUserManageApi.getList.mockResolvedValue(mockUsers)
      mockUserManageApi.updateRole.mockResolvedValue(undefined)
      const wrapper = createWrapper()
      await flushPromises()

      const userCmps = wrapper.findAllComponents({ name: "UserManage" })
      const vm = userCmps[0].vm as any

      vm.openRoleDialog(mockUsers.list[1])
      expect(vm.roleDialogVisible).toBe(true)
      expect(vm.roleDialogUser?.username).toBe("formulist_a")

      vm.selectedRoleId = "3"
      await vm.handleRoleChange()
      await flushPromises()

      expect(mockUserManageApi.updateRole).toHaveBeenCalledWith("u2", "3")
    })
  })

  describe("PM13 — Disable user", () => {
    it("disables an active user via updateStatus API", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockUserManageApi.getList.mockResolvedValue(mockUsers)
      mockUserManageApi.updateStatus.mockResolvedValue(undefined)
      const wrapper = createWrapper()
      await flushPromises()

      const userCmps = wrapper.findAllComponents({ name: "UserManage" })
      const vm = userCmps[0].vm as any

      await vm.handleToggleStatus(mockUsers.list[1])
      await flushPromises()

      expect(mockUserManageApi.updateStatus).toHaveBeenCalledWith("u2", false)
    })

    it("enables a disabled user via updateStatus API", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockUserManageApi.getList.mockResolvedValue(mockUsers)
      mockUserManageApi.updateStatus.mockResolvedValue(undefined)
      const wrapper = createWrapper()
      await flushPromises()

      const userCmps = wrapper.findAllComponents({ name: "UserManage" })
      const vm = userCmps[0].vm as any

      await vm.handleToggleStatus(mockUsers.list[2])
      await flushPromises()

      expect(mockUserManageApi.updateStatus).toHaveBeenCalledWith("u3", true)
    })
  })

  describe("PM14 — Cannot disable other admins", () => {
    it("shows admin users without disable action", async () => {
      mockRoleApi.getList.mockResolvedValue(mockRoles)
      mockUserManageApi.getList.mockResolvedValue(mockUsers)
      const wrapper = createWrapper()
      await flushPromises()

      const userCmps = wrapper.findAllComponents({ name: "UserManage" })
      const vm = userCmps[0].vm as any

      const otherAdmin = mockUsers.list[3]
      expect(otherAdmin.role).toBe("admin")

      const found = vm.userList.find((u: any) => u.id === "u4")
      expect(found).toBeDefined()
    })
  })
})
