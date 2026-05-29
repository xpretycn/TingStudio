<template>
  <div class="user-manage">
    <div class="section-header-enhanced">
      <div class="section-title-group">
        <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <h4 class="section-title-text">用户管理</h4>
      </div>
      <div class="section-header-right">
        <span class="section-title-count">共 {{ pagination.total }} 位用户</span>
      </div>
    </div>

    <div class="user-toolbar">
      <t-input v-model="searchKeyword" placeholder="搜索用户名..." clearable class="user-search-input" @enter="fetchUsers" @clear="fetchUsers">
        <template #prefix-icon><t-icon name="search" /></template>
      </t-input>
      <t-select v-model="filterRoleId" :options="roleFilterOptions" placeholder="角色筛选" clearable class="user-filter-select" @change="fetchUsers" />
      <t-select v-model="filterStatus" :options="statusFilterOptions" placeholder="状态筛选" clearable class="user-filter-select" @change="fetchUsers" />
    </div>

    <t-loading :loading="loading" />

    <div v-if="!loading && userList.length > 0" class="user-table-wrap">
      <t-table
        :data="userList"
        :columns="tableColumns"
        row-key="id"
        :pagination="tablePagination"
        @page-change="handlePageChange"
        table-layout="auto"
        hover
        stripe
      >
        <template #isActive="{ row }">
          <t-tag v-if="row.isActive" theme="success" variant="light" size="small">启用</t-tag>
          <t-tag v-else theme="default" variant="light" size="small">禁用</t-tag>
        </template>
        <template #createdAt="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
        <template #actions="{ row }">
          <div class="user-actions" v-if="row.id !== currentUserId">
            <t-button variant="text" theme="primary" size="small" @click="openRoleDialog(row)">切换角色</t-button>
            <t-popconfirm
              v-if="row.role !== 'admin'"
              :content="row.isActive ? '确定禁用该用户吗？' : '确定启用该用户吗？'"
              @confirm="handleToggleStatus(row)"
            >
              <t-button variant="text" :theme="row.isActive ? 'warning' : 'success'" size="small">
                {{ row.isActive ? '禁用' : '启用' }}
              </t-button>
            </t-popconfirm>
          </div>
          <div v-else class="user-actions">
            <t-tag theme="primary" variant="light" size="small">当前用户</t-tag>
          </div>
        </template>
      </t-table>
    </div>

    <div v-if="!loading && userList.length === 0" class="empty-state">
      <div class="empty-icon-wrap">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)"
          stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      </div>
      <p class="empty-text">{{ searchKeyword ? '未找到匹配的用户' : '暂无用户' }}</p>
      <p class="empty-hint">{{ searchKeyword ? '尝试其他关键词' : '用户注册后将在此展示' }}</p>
    </div>

    <t-dialog v-model:visible="roleDialogVisible"
      header="切换用户角色"
      :confirm-btn="{ loading: roleDialogLoading }"
      :on-confirm="handleRoleChange"
      @close="roleDialogUser = null; selectedRoleId = null">
      <div v-if="roleDialogUser" class="role-dialog-content">
        <div class="role-dialog-current">
          <span class="role-dialog-label">当前角色：</span>
          <t-tag theme="primary" variant="light">{{ roleDialogUser.roleName }}</t-tag>
        </div>
        <t-form label-width="80px" style="margin-top: 16px;">
          <t-form-item label="新角色">
            <t-select v-model="selectedRoleId" :options="roleSelectOptions" placeholder="请选择新角色" clearable />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { userManageApi } from '@/api/userManage'
import type { UserManageItem } from '@/api/userManage'
import { roleApi } from '@/api/role'
import type { Role } from '@/api/role'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/timeFormat'

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id ?? '')

const loading = ref(false)
const userList = ref<UserManageItem[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })

const searchKeyword = ref('')
const filterRoleId = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

const roleList = ref<Role[]>([])

const roleDialogVisible = ref(false)
const roleDialogLoading = ref(false)
const roleDialogUser = ref<UserManageItem | null>(null)
const selectedRoleId = ref<string | null>(null)

const statusFilterOptions = [
  { label: '启用', value: 'true' },
  { label: '禁用', value: 'false' },
]

const roleFilterOptions = computed(() =>
  roleList.value.map(r => ({ label: r.name, value: r.id }))
)

const roleSelectOptions = computed(() => {
  if (!roleDialogUser.value) return []
  return roleList.value
    .filter(r => r.id !== roleDialogUser.value?.roleId)
    .map(r => ({ label: r.name, value: r.id }))
})

const tableColumns = [
  { colKey: 'username', title: '用户名', width: 120 },
  { colKey: 'displayName', title: '显示名称', width: 120, cell: (h: unknown, { row }: { row: UserManageItem }) => row.displayName || '--' },
  { colKey: 'roleName', title: '角色', width: 120 },
  { colKey: 'isActive', title: '状态', width: 80, cell: { component: 'isActive' } },
  { colKey: 'createdAt', title: '创建时间', width: 120, cell: { component: 'createdAt' } },
  { colKey: 'actions', title: '操作', width: 180, cell: { component: 'actions' } },
]

const tablePagination = computed(() => ({
  current: pagination.value.page,
  pageSize: pagination.value.pageSize,
  total: pagination.value.total,
  showJumper: true,
  pageSizeOptions: [10, 20, 50],
}))

async function fetchUsers() {
  loading.value = true
  try {
    const res = await userManageApi.getList({
      keyword: searchKeyword.value || undefined,
      roleId: filterRoleId.value || undefined,
      isActive: filterStatus.value || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    })
    userList.value = res.list
    pagination.value = res.pagination
  } catch {
    userList.value = []
  } finally {
    loading.value = false
  }
}

async function fetchRoles() {
  try {
    roleList.value = await roleApi.getList()
  } catch {
    roleList.value = []
  }
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
})

function handlePageChange(params: { current: number; pageSize: number }) {
  pagination.value.page = params.current
  pagination.value.pageSize = params.pageSize
  fetchUsers()
}

function openRoleDialog(user: UserManageItem) {
  roleDialogUser.value = user
  selectedRoleId.value = null
  roleDialogVisible.value = true
}

async function handleRoleChange() {
  if (!roleDialogUser.value || !selectedRoleId.value) {
    MessagePlugin.warning('请选择新角色')
    return false
  }
  roleDialogLoading.value = true
  try {
    await userManageApi.updateRole(roleDialogUser.value.id, selectedRoleId.value)
    MessagePlugin.success('角色切换成功')
    roleDialogVisible.value = false
    roleDialogUser.value = null
    selectedRoleId.value = null
    await fetchUsers()
    return true
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '操作失败'
    MessagePlugin.error(msg)
    return false
  } finally {
    roleDialogLoading.value = false
  }
}

async function handleToggleStatus(user: UserManageItem) {
  try {
    await userManageApi.updateStatus(user.id, !user.isActive)
    MessagePlugin.success(user.isActive ? '用户已禁用' : '用户已启用')
    await fetchUsers()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '操作失败'
    MessagePlugin.error(msg)
  }
}
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.user-manage {
  min-height: 300px;
}

.section-header-enhanced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .section-title-group {
    display: flex;
    align-items: center;
    gap: 10px;

    .section-title-icon {
      flex-shrink: 0;
    }

    .section-title-text {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .section-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }

  .section-title-count {
    font-size: 13px;
    color: var(--color-text-placeholder);
  }
}

.user-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .user-search-input {
    max-width: 240px;
  }

  .user-filter-select {
    width: 140px;
  }
}

.user-table-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border-light, #e5e7eb);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;

  .empty-icon-wrap {
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin: 0 0 4px;
  }

  .empty-hint {
    font-size: 13px;
    color: var(--color-text-placeholder);
    margin: 0;
  }
}

.role-dialog-content {
  .role-dialog-current {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .role-dialog-label {
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .user-toolbar {
    flex-direction: column;
    align-items: stretch;

    .user-search-input {
      max-width: none;
    }

    .user-filter-select {
      width: 100%;
    }
  }
}
</style>
