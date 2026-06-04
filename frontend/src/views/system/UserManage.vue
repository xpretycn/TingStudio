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
        :data="sortedUsers"
        :columns="tableColumns"
        row-key="id"
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
      <div v-if="paginationStore.visible && pagination.total > 0" class="table-pagination">
        <div class="pagination-info">
          显示第 {{ (pagination.page - 1) * pagination.pageSize + 1 }}-{{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，共 {{ pagination.total }} 条数据
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" :class="{ 'pagination-btn--disabled': pagination.page === 1 }"
            :disabled="pagination.page === 1"
            @click="setPage(pagination.page - 1)">上一页</button>
          <template v-for="page in pageNumbers" :key="page">
            <button v-if="page !== '...'" class="pagination-btn"
              :class="{ 'pagination-btn--active': page === pagination.page }"
              @click="typeof page === 'number' && setPage(page)">{{ page }}</button>
            <span v-else class="pagination-ellipsis">...</span>
          </template>
          <button class="pagination-btn"
            :class="{ 'pagination-btn--disabled': pagination.page === totalPages }"
            :disabled="pagination.page === totalPages"
            @click="setPage(pagination.page + 1)">下一页</button>
        </div>
      </div>
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
import { ref, computed, onMounted, watch, onUnmounted, h } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { userManageApi } from '@/api/userManage'
import type { UserManageItem } from '@/api/userManage'
import { roleApi } from '@/api/role'
import type { Role } from '@/api/role'
import { useAuthStore } from '@/stores/auth'
import { usePaginationStore } from '@/stores/pagination'
import { formatDate } from '@/utils/timeFormat'

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id ?? '')
const paginationStore = usePaginationStore()

const loading = ref(false)
const userList = ref<UserManageItem[]>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0, totalPages: 0 })

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

const sortKey = ref<string>('')
const sortOrder = ref<'asc' | 'desc' | ''>('')
const sortedUsers = ref<UserManageItem[]>([])

const toggleSort = (key: string) => {
  if (sortKey.value !== key) {
    sortKey.value = key
    sortOrder.value = 'asc'
  } else {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : (sortOrder.value === 'desc' ? '' : 'asc')
    if (sortOrder.value === '') sortKey.value = ''
  }
  applySort()
}

const sortIconClass = (key: string) => {
  if (sortKey.value !== key) return 'custom-sort custom-sort--none'
  return sortOrder.value === 'asc' ? 'custom-sort custom-sort--asc' : 'custom-sort custom-sort--desc'
}

const sortTitle = (label: string, key: string) => {
  return () => h('span', {
    class: 'custom-sort-header',
    onClick: (e: Event) => { e.stopPropagation(); toggleSort(key); }
  }, [label, h('span', { class: sortIconClass(key) })])
}

const applySort = () => {
  if (!sortKey.value || !sortOrder.value) {
    sortedUsers.value = [...userList.value]
    return
  }
  const dir = sortOrder.value === 'desc' ? -1 : 1

  const sortFns: Record<string, (a: UserManageItem, b: UserManageItem) => number> = {
    username: (a, b) => (a.username || '').localeCompare(b.username || '', 'zh'),
    displayName: (a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'zh'),
    roleName: (a, b) => (a.roleName || '').localeCompare(b.roleName || '', 'zh'),
    isActive: (a, b) => Number(a.isActive) - Number(b.isActive),
    createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  }

  const fn = sortFns[sortKey.value]
  sortedUsers.value = fn
    ? [...userList.value].sort((a, b) => fn(a, b) * dir)
    : [...userList.value]
}

watch(userList, (val) => {
  if (sortKey.value && sortOrder.value) {
    applySort()
  } else {
    sortedUsers.value = [...val]
  }
}, { immediate: true })

const tableColumns = [
  { colKey: 'username', title: sortTitle('用户名', 'username'), width: 120 },
  { colKey: 'displayName', title: sortTitle('显示名称', 'displayName'), width: 120, cell: (_h: unknown, { row }: { row: UserManageItem }) => row.displayName || '--' },
  { colKey: 'roleName', title: sortTitle('角色', 'roleName'), width: 120 },
  { colKey: 'isActive', title: sortTitle('状态', 'isActive'), width: 80, cell: { component: 'isActive' } },
  { colKey: 'createdAt', title: sortTitle('创建时间', 'createdAt'), width: 120, cell: { component: 'createdAt' } },
  { colKey: 'actions', title: '操作', width: 180, cell: { component: 'actions' } },
]

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize) || 1)

const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value
  const current = pagination.value.page
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, '...', total]
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})

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
  paginationStore.register({
    current: pagination.value.page,
    pageSize: pagination.value.pageSize,
    total: pagination.value.total,
    onChange: (pageInfo: { current: number }) => {
      pagination.value.page = pageInfo.current
      fetchUsers()
    },
  })
  watch(pagination, (val) => paginationStore.update(val), { deep: true })

  fetchUsers()
  fetchRoles()
})

onUnmounted(() => {
  paginationStore.unregister()
})

function setPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  pagination.value.page = page
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
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
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

// 分页样式 — 参照 FormulaList.vue
.table-pagination {
  padding: 16px 24px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-container);
  border-top: 1px solid var(--color-bg-page);

  .pagination-info {
    font-size: 14px;
    color: var(--color-text-placeholder);
    font-weight: 400;
    white-space: nowrap;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pagination-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1-5) 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 8px);
    background-color: transparent;
    color: var(--color-text-regular, #6e6178);
    font-size: 14px;
    cursor: pointer;
    transition: all var(--transition-fast, 0.15s);
    white-space: nowrap;
    user-select: none;

    &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: var(--color-primary-bg);
      border-color: var(--color-primary-lighter);
      color: var(--color-primary-dark);
    }

    &.pagination-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed;
      color: var(--color-text-placeholder);
      background-color: transparent;
      border-color: var(--color-border);
      pointer-events: none;
    }

    &.pagination-btn--active {
      background-color: var(--color-primary);
      color: $text-white;
      border-color: var(--color-primary);
      font-weight: 600;
      box-shadow: $shadow-brand-sm;
      pointer-events: none;
    }
  }

  .pagination-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 34px;
    color: var(--color-text-placeholder);
    font-size: 14px;
    user-select: none;
  }
}
</style>

<style lang="scss">
.user-manage .custom-sort-header {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.user-manage .custom-sort-header:hover {
  color: var(--color-primary);
}

.user-manage .custom-sort {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: var(--space-0-5);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  opacity: 0.25;
  transition: all 0.2s;
}

.user-manage .custom-sort--none {
  border-top: 5px solid var(--color-text-placeholder);
  border-bottom: none;
}

.user-manage .custom-sort--asc {
  border-bottom: 5px solid var(--color-primary);
  border-top: none;
  opacity: 1;
}

.user-manage .custom-sort--desc {
  border-top: 5px solid var(--color-primary);
  border-bottom: none;
  opacity: 1;
}
</style>
