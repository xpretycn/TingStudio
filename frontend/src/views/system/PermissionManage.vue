<template>
  <div class="permission-cards">
    <!-- 角色管理 Card -->
    <div class="pm-card">
      <div class="pm-card-header">
        <div class="pm-card-title-group">
          <div class="pm-card-icon" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div class="pm-card-title-details">
            <h5 class="pm-card-title">角色管理</h5>
            <span class="pm-card-subtitle">管理系统角色与权限配置</span>
          </div>
        </div>
      </div>
      <div class="pm-card-body">
        <RoleManage />
      </div>
    </div>

    <!-- 用户管理 Card -->
    <div class="pm-card">
      <div class="pm-card-header">
        <div class="pm-card-title-group">
          <div class="pm-card-icon" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div class="pm-card-title-details">
            <h5 class="pm-card-title">用户管理</h5>
            <span class="pm-card-subtitle">管理用户账号与角色分配</span>
          </div>
        </div>
      </div>
      <div class="pm-card-body">
        <UserManage />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import RoleManage from './RoleManage.vue'
import UserManage from './UserManage.vue'
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.permission-cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pm-card {
  background: var(--color-bg-container, #fff);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--color-border);
    transform: translateY(-2px);
  }

  .pm-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 20px 12px;
    border-bottom: 1px solid var(--color-border-light);

    .pm-card-title-group {
      display: flex;
      align-items: center;
      gap: 12px;

      .pm-card-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .pm-card-title-details {
        .pm-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 4px 0;
        }

        .pm-card-subtitle {
          font-size: 12px;
          color: var(--color-text-placeholder);
        }
      }
    }
  }

  .pm-card-body {
    padding: 0;

    :deep(.section-header-enhanced) {
      display: none;
    }

    :deep(.user-toolbar) {
      padding: 16px 20px 0;
      margin-bottom: 12px;
    }

    :deep(.role-list),
    :deep(.user-table-wrap) {
      padding: 16px 20px;
    }
  }
}
</style>
