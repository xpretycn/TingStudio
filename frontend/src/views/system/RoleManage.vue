<template>
  <div class="role-manage">
    <div class="section-header-enhanced">
      <div class="section-title-group">
        <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <h4 class="section-title-text">角色管理</h4>
      </div>
      <div class="section-header-right">
        <span class="section-title-count">共 {{ roleList.length }} 个角色</span>
        <t-button theme="primary" @click="openCreateDialog">
          <template #icon><t-icon name="add" /></template>
          新增角色
        </t-button>
      </div>
    </div>

    <t-loading :loading="loading" />
    <div v-if="!loading" class="role-list">
      <div v-for="role in roleList" :key="role.id" class="role-card" :class="{ 'role-card--system': role.isSystem }">
        <div class="role-card-header">
          <div class="role-card-title-row">
            <span class="role-name">{{ role.name }}</span>
            <t-tag v-if="role.isSystem" theme="primary" variant="light" size="small">系统角色</t-tag>
          </div>
          <div class="role-card-meta">
            <span class="role-key">{{ role.roleKey }}</span>
            <span v-if="role.description" class="role-desc">{{ role.description }}</span>
          </div>
        </div>
        <div class="role-card-footer">
          <div class="role-card-stats">
            <span class="role-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              {{ role.permissionCount }}/18 项权限
            </span>
            <span class="role-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              {{ role.userCount }} 位用户
            </span>
          </div>
          <div class="role-card-actions">
            <t-button v-if="role.roleKey === 'admin'" variant="text" theme="default" size="small" @click="openPermissionPanel(role, true)">
              查看权限
            </t-button>
            <t-button v-else variant="text" theme="primary" size="small" @click="openPermissionPanel(role, role.roleKey === 'formulist')">
              {{ role.roleKey === 'formulist' ? '编辑权限' : '编辑权限' }}
            </t-button>
            <t-button v-if="!role.isSystem" variant="text" theme="default" size="small" @click="openEditDialog(role)">
              编辑
            </t-button>
            <t-popconfirm v-if="!role.isSystem && role.userCount === 0" content="确定删除该角色吗？删除后不可恢复。" @confirm="handleDeleteRole(role)">
              <t-button variant="text" theme="danger" size="small">删除角色</t-button>
            </t-popconfirm>
            <t-button v-if="!role.isSystem && role.userCount > 0" variant="text" theme="danger" size="small" @click="openDeleteWithUsersDialog(role)">
              删除角色
            </t-button>
          </div>
        </div>

        <div v-if="expandedRoleId === role.id" class="permission-panel">
          <div class="permission-panel-header">
            <span class="permission-panel-title">{{ role.name }} - 权限配置</span>
            <div class="permission-panel-actions">
              <span class="permission-count">已选 {{ selectedPermissionIds.length }}/18 项权限</span>
              <template v-if="!isReadOnly">
                <t-button variant="text" size="small" @click="selectAllRead">全选读取</t-button>
                <t-button variant="text" size="small" @click="selectAllWrite">全选写入</t-button>
                <t-button variant="text" size="small" theme="danger" @click="clearAll">清除全部</t-button>
              </template>
            </div>
          </div>
          <t-loading :loading="permissionLoading" />
          <div v-if="!permissionLoading" class="permission-grid">
            <div v-for="group in permissionGroups" :key="group.module" class="permission-group">
              <div class="permission-group-header">{{ group.moduleLabel }}</div>
              <div class="permission-row">
                <div class="permission-row-label">读取</div>
                <t-checkbox
                  :checked="isPermissionChecked(group.module, 'read')"
                  :disabled="isReadOnly"
                  @change="(val: boolean) => handlePermissionToggle(group.module, 'read', val)"
                />
              </div>
              <div class="permission-row">
                <div class="permission-row-label">写入</div>
                <t-checkbox
                  :checked="isPermissionChecked(group.module, 'write')"
                  :disabled="isReadOnly"
                  @change="(val: boolean) => handlePermissionToggle(group.module, 'write', val)"
                />
              </div>
            </div>
          </div>
          <div v-if="!isReadOnly" class="permission-panel-footer">
            <t-button variant="outline" @click="closePermissionPanel">取消</t-button>
            <t-button theme="primary" :loading="permissionSaving" @click="handleSavePermissions">保存权限</t-button>
          </div>
          <div v-if="isReadOnly" class="permission-panel-footer">
            <t-button variant="outline" @click="closePermissionPanel">关闭</t-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && roleList.length === 0" class="empty-state">
      <div class="empty-icon-wrap">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)"
          stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <p class="empty-text">暂无角色</p>
      <p class="empty-hint">点击上方按钮添加第一个角色</p>
    </div>

    <t-dialog v-model:visible="dialogVisible"
      :header="dialogMode === 'create' ? '新增角色' : '编辑角色'"
      :confirm-btn="{ loading: dialogLoading }"
      :on-confirm="handleDialogConfirm"
      @close="handleDialogClose">
      <t-form label-width="80px">
        <t-form-item label="角色名称">
          <t-input v-model="formName" placeholder="请输入角色名称" clearable maxlength="20" show-limit-number />
        </t-form-item>
        <t-form-item label="角色标识">
          <t-input v-model="formRoleKey" placeholder="请输入角色标识（英文）" clearable maxlength="30" show-limit-number :disabled="dialogMode === 'edit'" />
        </t-form-item>
        <t-form-item label="角色描述">
          <t-input v-model="formDescription" placeholder="请输入角色描述" clearable maxlength="100" show-limit-number />
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="deleteWithUsersDialogVisible"
      header="删除角色"
      :confirm-btn="{ loading: deleteLoading, theme: 'danger', content: '确认删除' }"
      :on-confirm="handleDeleteWithUsers"
      @close="deleteTargetRole = null">
      <div class="delete-warning-content">
        <p>该角色下有 <strong>{{ deleteTargetRole?.userCount ?? 0 }}</strong> 位用户，删除前需要将他们迁移到其他角色。</p>
        <t-form label-width="100px" style="margin-top: 16px;">
          <t-form-item label="迁移至角色">
            <t-select v-model="migrateToRoleId" :options="migrateRoleOptions" placeholder="请选择目标角色" clearable />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { roleApi } from '@/api/role'
import { permissionApi } from '@/api/permission'
import type { Role, PermissionGroup } from '@/api/role'

const loading = ref(false)
const roleList = ref<Role[]>([])

const dialogVisible = ref(false)
const dialogLoading = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingRole = ref<Role | null>(null)
const formName = ref('')
const formRoleKey = ref('')
const formDescription = ref('')

const expandedRoleId = ref<string | null>(null)
const isReadOnly = ref(false)
const permissionLoading = ref(false)
const permissionSaving = ref(false)
const permissionGroups = ref<PermissionGroup[]>([])
const selectedPermissionIds = ref<string[]>([])

const deleteWithUsersDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTargetRole = ref<Role | null>(null)
const migrateToRoleId = ref<string | null>(null)

const migrateRoleOptions = computed(() => {
  if (!deleteTargetRole.value) return []
  return roleList.value
    .filter(r => r.id !== deleteTargetRole.value?.id)
    .map(r => ({ label: r.name, value: r.id }))
})

async function fetchRoles() {
  loading.value = true
  try {
    roleList.value = await roleApi.getList()
  } catch {
    roleList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRoles()
})

function openCreateDialog() {
  dialogMode.value = 'create'
  editingRole.value = null
  formName.value = ''
  formRoleKey.value = ''
  formDescription.value = ''
  dialogVisible.value = true
}

function openEditDialog(role: Role) {
  dialogMode.value = 'edit'
  editingRole.value = role
  formName.value = role.name
  formRoleKey.value = role.roleKey
  formDescription.value = role.description
  dialogVisible.value = true
}

function handleDialogClose() {
  formName.value = ''
  formRoleKey.value = ''
  formDescription.value = ''
  editingRole.value = null
}

async function handleDialogConfirm() {
  if (!formName.value.trim()) {
    MessagePlugin.warning('请输入角色名称')
    return false
  }
  if (dialogMode.value === 'create' && !formRoleKey.value.trim()) {
    MessagePlugin.warning('请输入角色标识')
    return false
  }
  dialogLoading.value = true
  try {
    if (dialogMode.value === 'create') {
      await roleApi.create({
        name: formName.value.trim(),
        roleKey: formRoleKey.value.trim(),
        description: formDescription.value.trim(),
      })
      MessagePlugin.success('角色创建成功')
    } else if (editingRole.value) {
      await roleApi.update(editingRole.value.id, {
        name: formName.value.trim(),
        description: formDescription.value.trim(),
      })
      MessagePlugin.success('角色更新成功')
    }
    dialogVisible.value = false
    await fetchRoles()
    return true
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '操作失败'
    MessagePlugin.error(msg)
    return false
  } finally {
    dialogLoading.value = false
  }
}

async function handleDeleteRole(role: Role) {
  try {
    await roleApi.delete(role.id)
    MessagePlugin.success('角色删除成功')
    await fetchRoles()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '删除失败'
    MessagePlugin.error(msg)
  }
}

function openDeleteWithUsersDialog(role: Role) {
  deleteTargetRole.value = role
  migrateToRoleId.value = null
  deleteWithUsersDialogVisible.value = true
}

async function handleDeleteWithUsers() {
  if (!deleteTargetRole.value) return false
  if (!migrateToRoleId.value) {
    MessagePlugin.warning('请选择迁移目标角色')
    return false
  }
  deleteLoading.value = true
  try {
    await roleApi.delete(deleteTargetRole.value.id)
    MessagePlugin.success('角色删除成功，用户已迁移')
    deleteWithUsersDialogVisible.value = false
    deleteTargetRole.value = null
    await fetchRoles()
    return true
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '删除失败'
    MessagePlugin.error(msg)
    return false
  } finally {
    deleteLoading.value = false
  }
}

async function openPermissionPanel(role: Role, readOnly: boolean) {
  if (expandedRoleId.value === role.id) {
    closePermissionPanel()
    return
  }
  expandedRoleId.value = role.id
  isReadOnly.value = readOnly
  permissionLoading.value = true
  try {
    const [detail, groups] = await Promise.all([
      roleApi.getDetail(role.id),
      permissionApi.getList(),
    ])
    permissionGroups.value = groups
    selectedPermissionIds.value = detail.permissions.map(p => p.id)
  } catch {
    MessagePlugin.error('获取权限信息失败')
    closePermissionPanel()
  } finally {
    permissionLoading.value = false
  }
}

function closePermissionPanel() {
  expandedRoleId.value = null
  isReadOnly.value = false
  permissionGroups.value = []
  selectedPermissionIds.value = []
}

function isPermissionChecked(module: string, action: string): boolean {
  const group = permissionGroups.value.find(g => g.module === module)
  if (!group) return false
  const perm = group.permissions.find(p => p.action === action)
  if (!perm) return false
  return selectedPermissionIds.value.includes(perm.id)
}

function handlePermissionToggle(module: string, action: string, checked: boolean) {
  const group = permissionGroups.value.find(g => g.module === module)
  if (!group) return
  const perm = group.permissions.find(p => p.action === action)
  if (!perm) return

  if (checked) {
    if (!selectedPermissionIds.value.includes(perm.id)) {
      selectedPermissionIds.value.push(perm.id)
    }
    if (action === 'write') {
      const readPerm = group.permissions.find(p => p.action === 'read')
      if (readPerm && !selectedPermissionIds.value.includes(readPerm.id)) {
        selectedPermissionIds.value.push(readPerm.id)
      }
    }
  } else {
    selectedPermissionIds.value = selectedPermissionIds.value.filter(id => id !== perm.id)
    if (action === 'read') {
      const writePerm = group.permissions.find(p => p.action === 'write')
      if (writePerm) {
        selectedPermissionIds.value = selectedPermissionIds.value.filter(id => id !== writePerm.id)
      }
    }
  }
}

function selectAllRead() {
  const ids = new Set(selectedPermissionIds.value)
  for (const group of permissionGroups.value) {
    const readPerm = group.permissions.find(p => p.action === 'read')
    if (readPerm) ids.add(readPerm.id)
  }
  selectedPermissionIds.value = [...ids]
}

function selectAllWrite() {
  const ids = new Set(selectedPermissionIds.value)
  for (const group of permissionGroups.value) {
    const readPerm = group.permissions.find(p => p.action === 'read')
    const writePerm = group.permissions.find(p => p.action === 'write')
    if (writePerm) ids.add(writePerm.id)
    if (readPerm) ids.add(readPerm.id)
  }
  selectedPermissionIds.value = [...ids]
}

function clearAll() {
  selectedPermissionIds.value = []
}

async function handleSavePermissions() {
  if (!expandedRoleId.value) return
  permissionSaving.value = true
  try {
    await roleApi.updatePermissions(expandedRoleId.value, selectedPermissionIds.value)
    MessagePlugin.success('权限保存成功')
    await fetchRoles()
    closePermissionPanel()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '保存失败'
    MessagePlugin.error(msg)
  } finally {
    permissionSaving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.role-manage {
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

.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-card {
  border-radius: 12px;
  border: 1px solid var(--color-border-light, #e5e7eb);
  background: var(--color-bg-container, #fff);
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    border-color: var(--color-border, #d1d5db);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &--system {
    border-left: 3px solid var(--color-primary);
  }

  .role-card-header {
    padding: 16px 16px 8px;

    .role-card-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .role-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .role-card-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }

    .role-key {
      color: var(--color-text-placeholder);
      font-family: monospace;
      background: var(--color-bg-page, #f3f4f6);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .role-desc {
      color: var(--color-text-secondary);
    }
  }

  .role-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 14px;

    .role-card-stats {
      display: flex;
      gap: 16px;
    }

    .role-stat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--color-text-placeholder);
    }

    .role-card-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.permission-panel {
  border-top: 1px solid var(--color-border-light, #e5e7eb);
  background: var(--color-bg-page, #f8fafc);
  padding: 16px;

  .permission-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .permission-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .permission-panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .permission-count {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-right: 4px;
  }

  .permission-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .permission-group {
    background: var(--color-bg-container);
    border: 1px solid var(--color-border-light, #e5e7eb);
    border-radius: 10px;
    padding: 12px;
  }

  .permission-group-header {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--color-bg-page, #f3f4f6);
  }

  .permission-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
  }

  .permission-row-label {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .permission-panel-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-light, #e5e7eb);
  }
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

.delete-warning-content {
  p {
    font-size: 14px;
    color: var(--color-text-primary);
    line-height: 1.6;
    margin: 0;
  }
}

@media (max-width: 768px) {
  .permission-panel .permission-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .permission-panel .permission-grid {
    grid-template-columns: 1fr;
  }
}
</style>
