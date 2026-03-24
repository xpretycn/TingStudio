<template>
  <div class="tools-page">
    <div class="tools-grid">
      <!-- 工具卡片 -->
      <div v-for="tool in tools" :key="tool.id" class="tool-card" @click="handleToolClick(tool)">
        <div class="tool-icon" :style="{ background: tool.bgColor }">
          {{ tool.icon }}
        </div>
        <div class="tool-info">
          <h3 class="tool-title">{{ tool.title }}</h3>
          <p class="tool-desc">{{ tool.description }}</p>
        </div>
        <div class="tool-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

const tools = ref([
  {
    id: 1,
    icon: '🧮',
    title: '配方计算器',
    description: '快速计算配方成分比例和成本',
    bgColor: 'linear-gradient(135deg, #FFB5C8, #FF8FAB)'
  },
  {
    id: 2,
    icon: '📊',
    title: '数据统计',
    description: '查看配方和客户数据统计报表',
    bgColor: 'linear-gradient(135deg, #E8D5F5, #D4B8F0)'
  },
  {
    id: 3,
    icon: '🔍',
    title: '配方搜索',
    description: '按关键词快速查找配方',
    bgColor: 'linear-gradient(135deg, #B8D8F0, #9BC5F0)'
  },
  {
    id: 4,
    icon: '📋',
    title: '模板管理',
    description: '创建和管理常用配方模板',
    bgColor: 'linear-gradient(135deg, #F5D8B8, #F0C5A0)'
  },
  {
    id: 5,
    icon: '💾',
    title: '数据备份',
    description: '备份和恢复重要数据',
    bgColor: 'linear-gradient(135deg, #D8F5D8, #C5F0C5)'
  },
  {
    id: 6,
    icon: '⚙️',
    title: '系统设置',
    description: '配置系统参数和偏好设置',
    bgColor: 'linear-gradient(135deg, #F0F0F0, #E0E0E0)'
  }
])

const handleToolClick = (tool: any) => {
  MessagePlugin.info(`${tool.title} 功能开发中，敬请期待~`)
}
</script>

<style scoped lang="scss">
.tools-page {
  width: 100%;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 2px solid rgba(255, 181, 200, 0.15);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(255, 143, 171, 0.05);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(255, 143, 171, 0.2);
    border-color: rgba(255, 143, 171, 0.3);
  }

  &:active {
    transform: translateY(-2px) scale(0.98);
    transition: all 0.15s ease-out;
  }

  .tool-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    flex-shrink: 0;
  }

  .tool-info {
    flex: 1;

    .tool-title {
      font-size: 16px;
      font-weight: 600;
      color: #5D4E60;
      margin: 0 0 6px 0;
    }

    .tool-desc {
      font-size: 13px;
      color: #9B8FA0;
      margin: 0;
      line-height: 1.5;
    }
  }

  .tool-arrow {
    color: #9B8FA0;
    transition: all 0.3s;
    flex-shrink: 0;
  }

  &:hover .tool-arrow {
    color: #FF6B8A;
    transform: translateX(4px);
  }
}

// Responsive
@media screen and (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .tool-card {
    padding: 20px;

    .tool-icon {
      width: 56px;
      height: 56px;
      font-size: 28px;
    }
  }
}
</style>
