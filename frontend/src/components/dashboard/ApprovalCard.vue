<script setup lang="ts">
import { computed } from "vue"
import { useAuthStore } from "@/stores/auth"
import { useApprovalStore } from "@/stores/approval"
import MyApprovalPanel from "./MyApprovalPanel.vue"
import AdminReviewPanel from "./AdminReviewPanel.vue"

const authStore = useAuthStore()
const approvalStore = useApprovalStore()
const isAdmin = computed(() => authStore.user?.role === "admin")

const materialPendingCount = computed(() => approvalStore.materialPendingCount)
</script>

<template>
  <section class="bento-card bento-approval" data-testid="dashboard-approval">
    <header class="bento-approval__header">
      <h3 class="bento-approval__title">
        <t-icon name="file-paste" />
        {{ isAdmin ? "审批中心" : "我的审批" }}
      </h3>
      <t-tag v-if="isAdmin" theme="warning" variant="light" size="small">
        审核 · {{ approvalStore.pendingCount + materialPendingCount }} 项
      </t-tag>
      <t-tag v-else theme="primary" variant="light" size="small">
        提交追踪
      </t-tag>
    </header>
    <div class="bento-approval__body">
      <MyApprovalPanel v-if="!isAdmin" />
      <AdminReviewPanel v-if="isAdmin" />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.bento-approval {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-container);
  border-radius: var(--radius-3xl, 16px);
  padding: var(--space-5, 20px);
  box-shadow: var(--shadow-card, 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06));
  border: 1px solid var(--color-border);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: var(--space-3, 12px);
    border-bottom: 1px solid var(--color-border-light);
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
}
</style>