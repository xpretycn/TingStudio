<template>
  <div class="model-management">
    <section class="dashboard-grid">
      <div v-for="(card, idx) in dashboardCards" :key="card.label" class="stat-card"
        :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
        <div class="stat-card-top">
          <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
          </div>
          <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">{{ card.badge }}</span>
        </div>
        <p class="stat-label">{{ card.label }}</p>
        <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
      </div>
    </section>

    <t-card class="content-card" bordered>
      <div class="data-center-toolbar">
        <div class="toolbar-left-section">
          <div class="toolbar-title-section">
            <h3 class="toolbar-title">
              模型管理
            </h3>
            <p class="toolbar-subtitle">模型配置、用量监控、预警管理与健康检测</p>
          </div>
        </div>
        <div class="toolbar-right-section">
          <button v-if="isAdmin" class="add-model-btn" @click="showAddDrawer = true">
            <t-icon name="add" class="add-icon" />
            新增模型
          </button>
        </div>
      </div>

      <div class="mm-body">
        <div class="mm-nav" :class="{ 'mm-nav--collapsed': navCollapsed }">
          <div v-for="tab in tabs" :key="tab.value" class="nav-tab" :class="{ active: activeTab === tab.value }"
            :title="navCollapsed ? tab.label : ''" role="tab" tabindex="0" @click="activeTab = tab.value"
            @keydown.enter="activeTab = tab.value">
            <svg class="nav-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" v-html="tab.iconPath"></svg>
            <span class="nav-tab-label">{{ tab.label }}</span>
          </div>
          <button type="button" class="nav-collapse-btn" @click="navCollapsed = !navCollapsed"
            :title="navCollapsed ? '展开导航' : '折叠导航'" aria-label="切换导航折叠状态">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"
              :style="{ transform: navCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <div class="mm-content">
          <Transition name="content-fade" mode="out-in">
            <!-- 模型管理 -->
            <div v-if="activeTab === 'models'" key="models" class="tab-panel">
              <!-- 模型列表标题 -->
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <h4 class="section-title-text">模型列表</h4>
                </div>
                <span class="section-title-count">共 {{ modelStore.models.length }} 个模型</span>
              </div>
              <!-- 模型列表内容 -->
              <div class="model-grid">
                <div v-for="model in modelStore.models" :key="model.id" class="model-card">
                  <div class="model-card-header">
                    <div class="model-name-row">
                      <div class="model-logo-wrap">
                        <img loading="lazy" :src="getModelLogo(model.provider)" :alt="model.name" class="model-logo"
                          @error="(e: Event) => handleLogoError(e)" />
                        <span class="model-fallback" :style="{ color: getFallbackColor(model.provider) }">
                          {{ getFallbackLetter(model.provider) }}
                        </span>
                      </div>
                      <span class="model-name">{{ model.name }}</span>
                      <span :class="['health-dot', model.healthStatus]">
                        {{ healthStatusText(model.healthStatus) }}
                      </span>
                      <div class="model-provider">{{ model.provider }}</div>
                    </div>
                  </div>
                  <div class="model-card-body">
                    <div class="model-field">
                      <span class="field-label">当前版本</span>
                      <t-select v-model="model.model" :disabled="!isAdmin" size="small" style="flex: 1"
                        @change="(val: any) => handleVersionChange(model, String(val))">
                        <t-option v-for="v in getVersionsForProvider(model.provider)" :key="v.value" :value="v.value"
                          :label="v.label" />
                      </t-select>
                    </div>
                    <div v-if="model.visionModel" class="model-field">
                      <span class="field-label">视觉模型</span>
                      <span class="field-value">{{ model.visionModel }}</span>
                    </div>
                    <div class="model-field">
                      <span class="field-label">API Key</span>
                      <span :class="['field-value', model.apiKeyConfigured ? 'configured' : 'not-configured']">
                        {{ model.apiKeyConfigured ? '已配置 ✓' : '未配置 ✗' }}
                      </span>
                    </div>
                    <div class="model-field">
                      <span class="field-label">检测间隔</span>
                      <span class="field-value">{{ model.healthCheckIntervalDays }}天</span>
                    </div>
                    <div class="model-field">
                      <span class="field-label">备用模型</span>
                      <span class="field-value">{{ model.fallbackProvider || '未设置' }}</span>
                    </div>
                  </div>
                  <div class="model-card-footer">
                    <div class="model-usage-mini">
                      <span>今日 {{ model.todayCalls }}次</span>
                      <span>{{ formatTokens(model.todayTokens) }} tokens</span>
                    </div>
                    <div class="model-actions">
                      <t-button v-if="isAdmin" size="small" variant="text" @click="handleTestConnection(model)">
                        测试
                      </t-button>
                      <t-button v-if="isAdmin" size="small" variant="text" @click="openEditDialog(model)">
                        编辑
                      </t-button>
                      <t-popconfirm v-if="isAdmin" content="确认移除此模型？" @confirm="handleDeleteModel(model)">
                        <t-button size="small" variant="text" theme="danger">移除</t-button>
                      </t-popconfirm>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 用量统计 -->
            <div v-else-if="activeTab === 'usage'" key="usage" class="tab-panel">
              <!-- 用量统计标题 -->
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <h4 class="section-title-text">用量统计</h4>
                </div>
                <div class="date-range">
                  <button class="refresh-usage-btn" :class="{ 'refresh-usage-btn--spinning': usageRefreshing }"
                    @click="refreshUsageStats">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span>刷新</span>
                  </button>
                  <t-date-range-picker v-model="usageDateRange" size="small" clearable
                    @change="handleUsageDateChange" />
                </div>
              </div>
              <!-- 用量统计内容 -->
              <div class="charts-grid">
                <div class="chart-card">
                  <div class="section-header-enhanced section-header-inline">
                    <div class="section-title-group">
                      <svg class="section-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                      <h4 class="section-title-text section-title-text--sm">Token 消耗趋势</h4>
                    </div>
                  </div>
                  <div v-if="modelStore.usageTrend.length > 0" ref="trendChartRef" class="chart-container"></div>
                  <div v-else class="chart-empty">
                    <div class="chart-empty-icon-wrap">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    </div>
                    <p class="chart-empty-text">暂无Token消耗趋势数据</p>
                    <p class="chart-empty-hint">模型产生调用后，消耗趋势将在此展示</p>
                  </div>
                </div>
                <div class="chart-card">
                  <div class="section-header-enhanced section-header-inline">
                    <div class="section-title-group">
                      <svg class="section-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#EC4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12l3 3 5-5" />
                      </svg>
                      <h4 class="section-title-text section-title-text--sm">模型用量占比</h4>
                    </div>
                  </div>
                  <div v-if="modelStore.usageDistribution.some(d => d.tokens > 0)" ref="pieChartRef"
                    class="chart-container"></div>
                  <div v-else class="chart-empty">
                    <div class="chart-empty-icon-wrap">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                        <path d="M22 12A10 10 0 0 0 12 2v10z" />
                      </svg>
                    </div>
                    <p class="chart-empty-text">暂无模型用量占比数据</p>
                    <p class="chart-empty-hint">模型产生调用后，用量占比将在此展示</p>
                    <button class="chart-empty-action" @click="activeTab = 'logs'">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      查看调用日志
                    </button>
                  </div>
                </div>
              </div>
              <!-- 用量统计内容 -->
              <div class="usage-table-card">
                <!-- 用量统计内容标题 -->
                <div class="section-header-enhanced section-header-inline">
                  <div class="section-title-group">
                    <svg class="section-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <h4 class="section-title-text section-title-text--sm">各模型用量明细</h4>
                  </div>
                </div>
                <!-- 用量统计内容表格 -->
                <t-table :data="modelStore.usageSummary" :columns="usageColumns" size="small" row-key="provider" />
              </div>
            </div>
            <!-- 预警配置 -->
            <div v-else-if="activeTab === 'alerts'" key="alerts" class="tab-panel">
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <h4 class="section-title-text">预警配置</h4>
                </div>
              </div>
              <div class="alert-config-grid">
                <div v-for="config in modelStore.alertConfigs" :key="config.id" class="alert-config-card">
                  <div class="alert-config-header">
                    <div class="alert-config-name-row model-logo-wrap model-logo-wrap--md">
                      <img loading="lazy" :src="getModelLogo(config.provider)" :alt="config.model_name"
                        class="model-logo" @error="(e: Event) => handleLogoError(e)" />
                      <span class="alert-config-model-name">{{ config.model_name }}</span>
                    </div>
                    <t-switch :value="!!config.enabled" :disabled="!isAdmin"
                      @change="(val: any) => { config.enabled = val ? 1 : 0; handleAlertConfigChange(config); }" />
                  </div>
                  <div class="alert-config-body">
                    <div class="alert-config-field">
                      <span class="field-label">日调用上限</span>
                      <div class="field-input-with-unit">
                        <t-input-number v-model="config.daily_call_limit" :disabled="!isAdmin" size="small" :min="0"
                          :step="100" theme="normal" @change="() => handleAlertConfigChange(config)" />
                        <span class="field-unit">次/日</span>
                      </div>
                    </div>
                    <div class="alert-config-field">
                      <span class="field-label">月Token上限</span>
                      <div class="field-input-with-unit">
                        <t-input-number v-model="config.monthly_token_limit" :disabled="!isAdmin" size="small" :min="0"
                          :step="100000" theme="normal" @change="() => handleAlertConfigChange(config)" />
                        <span class="field-unit">Token/月</span>
                      </div>
                    </div>
                    <div class="alert-config-field">
                      <span class="field-label">预警阈值</span>
                      <div class="field-input-with-unit">
                        <t-input-number v-model="config.warning_threshold" :disabled="!isAdmin" size="small" :min="1"
                          :max="100" theme="normal" @change="() => handleAlertConfigChange(config)" />
                        <span class="field-unit">%</span>
                      </div>
                    </div>
                    <div class="alert-config-field">
                      <span class="field-label">严重阈值</span>
                      <div class="field-input-with-unit">
                        <t-input-number v-model="config.critical_threshold" :disabled="!isAdmin" size="small" :min="1"
                          :max="100" theme="normal" @change="() => handleAlertConfigChange(config)" />
                        <span class="field-unit">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="section-header-enhanced" style="margin-top: 24px">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path
                      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <h4 class="section-title-text">预警记录</h4>
                </div>
              </div>
              <t-table v-if="modelStore.alertRecords.length > 0" :data="modelStore.alertRecords"
                :columns="alertRecordColumns" size="small" row-key="id" />
              <div v-else class="data-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p class="data-empty-text">暂无预警记录</p>
                <p class="data-empty-hint">当模型触发预警时，记录将在此展示</p>
              </div>
            </div>
            <!-- 调用日志 -->
            <div v-else-if="activeTab === 'logs'" key="logs" class="tab-panel">
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <h4 class="section-title-text">调用日志</h4>
                </div>
                <div class="log-filters">
                  <t-select v-model="logFilters.provider" placeholder="模型" clearable size="small" style="width: 120px">
                    <t-option v-for="m in modelStore.models" :key="m.provider" :value="m.provider" :label="m.name" />
                  </t-select>
                  <t-select v-model="logFilters.callType" placeholder="类型" clearable size="small" style="width: 120px">
                    <t-option value="parse_formula" label="解析配方" />
                    <t-option value="parse_nutrition" label="解析营养" />
                    <t-option value="natural_search" label="自然检索" />
                    <t-option value="health_check" label="健康检测" />
                  </t-select>
                  <t-select v-model="logFilters.status" placeholder="状态" clearable size="small" style="width: 100px">
                    <t-option value="success" label="成功" />
                    <t-option value="error" label="失败" />
                    <t-option value="fallback" label="自动切换" />
                  </t-select>
                </div>
              </div>
              <t-table v-if="modelStore.usageLogs.length > 0" :data="modelStore.usageLogs" :columns="logColumns"
                size="small" row-key="id"
                :pagination="{ current: logPage, pageSize: 20, total: modelStore.usageLogsTotal }"
                @page-change="handleLogPageChange" />
              <div v-else class="data-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <p class="data-empty-text">暂无调用日志</p>
                <p class="data-empty-hint">模型产生调用后，日志将在此展示</p>
              </div>
            </div>

            <div v-else key="empty" class="tab-panel">
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <h4 class="section-title-text">请选择功能</h4>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </t-card>

    <t-drawer v-model:visible="showAddDrawer" :footer="false" size="520px" placement="right" class="model-drawer"
      destroy-on-close :close-btn="false">
      <template #header>
        <div class="drawer-header">
          <div class="header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
              <line x1="12" y1="22" x2="12" y2="15.5" />
              <polyline points="22 8.5 12 15.5 2 8.5" />
            </svg>
            <span class="header-title">新增模型</span>
          </div>
          <div class="header-actions">
            <button class="confirm-btn create-btn" @click="handleAddModel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              确认新增
            </button>
          </div>
        </div>
      </template>
      <t-form ref="addFormRef" :data="addForm" label-align="top">
        <div class="drawer-card info-card">
          <div class="card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3h6v8l-3 4-3-4V3z" />
              <line x1="12" y1="7" x2="12" y2="3" />
              <line x1="9" y1="15" x2="15" y2="15" />
              <path d="M8 19h8" />
            </svg>
            <span>基本信息</span>
          </div>
          <div class="card-body">
            <div class="form-row two-col">
              <t-form-item label="Provider 标识">
                <t-input v-model="addForm.provider" placeholder="如: dashscope, zhipu, deepseek" />
              </t-form-item>
              <t-form-item label="显示名称">
                <t-input v-model="addForm.name" placeholder="如: 通义千问" />
              </t-form-item>
            </div>
            <t-form-item label="描述">
              <t-textarea v-model="addForm.description" :maxlength="200" :autosize="{ minRows: 2, maxRows: 3 }" />
            </t-form-item>
          </div>
        </div>
        <div class="drawer-card api-card">
          <div class="card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>接口配置</span>
          </div>
          <div class="card-body">
            <div class="form-row two-col">
              <t-form-item label="API 基础地址">
                <t-input v-model="addForm.baseUrl" placeholder="https://api.example.com/v1" />
              </t-form-item>
              <t-form-item label="API Key">
                <t-input v-model="addForm.apiKey" type="password" placeholder="sk-..." />
              </t-form-item>
            </div>
          </div>
        </div>
        <div class="drawer-card param-card">
          <div class="card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>模型参数</span>
          </div>
          <div class="card-body">
            <div class="form-row two-col">
              <t-form-item label="默认模型版本">
                <t-input v-model="addForm.model" placeholder="如: qwen-plus" />
              </t-form-item>
              <t-form-item label="视觉模型（可选）">
                <t-input v-model="addForm.visionModel" placeholder="如: qwen-vl-plus" />
              </t-form-item>
            </div>
            <t-form-item label="支持视觉">
              <t-switch v-model="addForm.supportsVision" />
            </t-form-item>
          </div>
        </div>
      </t-form>
    </t-drawer>

    <t-drawer v-model:visible="showEditDrawer" :footer="false" size="520px" placement="right" class="model-drawer"
      destroy-on-close :close-btn="false">
      <template #header>
        <div class="drawer-header">
          <div class="header-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span class="header-title">编辑模型</span>
          </div>
          <div class="header-actions">
            <button class="confirm-btn update-btn" @click="handleEditModel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              保存修改
            </button>
          </div>
        </div>
      </template>
      <t-form ref="editFormRef" :data="editForm" label-align="top">
        <div class="drawer-card info-card">
          <div class="card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3h6v8l-3 4-3-4V3z" />
              <line x1="12" y1="7" x2="12" y2="3" />
              <line x1="9" y1="15" x2="15" y2="15" />
              <path d="M8 19h8" />
            </svg>
            <span>基本信息</span>
          </div>
          <div class="card-body">
            <div class="form-row two-col">
              <t-form-item label="显示名称">
                <t-input v-model="editForm.name" />
              </t-form-item>
              <t-form-item label="描述">
                <t-textarea v-model="editForm.description" :maxlength="200" :autosize="{ minRows: 1, maxRows: 3 }" />
              </t-form-item>
            </div>
          </div>
        </div>
        <div class="drawer-card api-card">
          <div class="card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>接口配置</span>
          </div>
          <div class="card-body">
            <t-form-item label="API 基础地址">
              <t-input v-model="editForm.baseUrl" />
            </t-form-item>
            <t-form-item label="API Key">
              <t-input v-model="editForm.apiKey" type="password" placeholder="留空则不修改" />
            </t-form-item>
          </div>
        </div>
        <div class="drawer-card param-card">
          <div class="card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>模型参数</span>
          </div>
          <div class="card-body">
            <div class="form-row two-col">
              <t-form-item label="默认模型版本">
                <t-input v-model="editForm.model" />
              </t-form-item>
              <t-form-item label="视觉模型">
                <t-input v-model="editForm.visionModel" />
              </t-form-item>
            </div>
            <div class="form-row two-col">
              <t-form-item label="支持视觉">
                <t-switch v-model="editForm.supportsVision" />
              </t-form-item>
              <t-form-item label="健康检测间隔（天）">
                <t-input-number v-model="editForm.healthCheckIntervalDays" :min="1" :max="30" />
              </t-form-item>
            </div>
            <t-form-item label="备用模型">
              <div class="fallback-model-field">
                <div v-if="editForm.fallbackProvider" class="fallback-logo-wrap">
                  <img loading="lazy" :src="getModelLogo(editForm.fallbackProvider)"
                    :alt="getFallbackModelName()" class="fallback-logo"
                    @error="(e: Event) => handleLogoError(e)" />
                  <span class="model-fallback" :style="{ color: getFallbackColor(editForm.fallbackProvider) }">
                    {{ getFallbackLetter(editForm.fallbackProvider) }}
                  </span>
                </div>
                <t-select v-model="editForm.fallbackProvider" clearable placeholder="选择备用模型" style="flex: 1">
                  <t-option v-for="m in modelStore.models.filter(x => x.id !== editingModelId)" :key="m.provider"
                    :value="m.provider" :label="m.name" />
                </t-select>
              </div>
            </t-form-item>
          </div>
        </div>
      </t-form>
    </t-drawer>

    <section class="activity-section">
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            近期操作动态
          </h4>
          <div class="activity-nav">
            <button class="activity-nav-btn" :disabled="activityPage <= 1" @click="activityPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ activityPage }} / {{ activityTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="activityPage >= activityTotalPages" @click="activityNext"
              title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        <div class="timeline-list">
          <div v-for="(item, index) in pagedActivityItems" :key="index" class="timeline-item"
            :class="{ 'timeline-item--last': index === pagedActivityItems.length - 1 }">
            <div class="timeline-dot" :class="'timeline-dot--' + item.type">
              <span class="timeline-dot-inner"></span>
            </div>
            <div class="timeline-content">
              <p class="timeline-title">{{ item.title }}</p>
              <p class="timeline-desc">{{ item.desc }}</p>
              <span class="timeline-time">{{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="activity-card activity-card--assistant">
        <div class="assistant-content">
          <h4 class="assistant-title">模型助手中心</h4>
          <p class="assistant-desc">{{ modelAssistantMessage }}</p>
          <button class="assistant-btn" @click="handleAssistantAction">
            {{ modelAssistantButtonText }}
          </button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">AI</span>
              <span class="assistant-avatar">模</span>
              <span class="assistant-avatar">型</span>
            </div>
            <span class="assistant-hint">{{ modelStore.models.length }} 个模型可用</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" />
          <path d="M2 17L12 22L22 17" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M2 12L12 17L22 12" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useModelStore } from "@/stores/model";
import { useAuthStore } from "@/stores/auth";
import type { ModelItem, AlertConfigItem } from "@/api/model";
import * as echarts from "echarts";

const modelStore = useModelStore();
const authStore = useAuthStore();

const isAdmin = computed(() => authStore.user?.role === "admin");
const activeTab = ref("models");
const navCollapsed = ref(false);
const showAddDrawer = ref(false);
const showEditDrawer = ref(false);
const editingModelId = ref("");
const usageDateRange = ref<string[]>([]);
const logPage = ref(1);
const logFilters = ref({ provider: "", callType: "", status: "" });

interface ActivityItem { type: 'success' | 'info' | 'warning'; title: string; desc: string; time: string; }
const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = [];
  modelStore.models.forEach(m => {
    if (m.healthStatus === 'healthy') {
      items.push({ type: 'success', title: `${m.name} 连通正常`, desc: `模型健康检测通过，服务可用`, time: '刚刚' });
    } else if (m.healthStatus === 'unhealthy') {
      items.push({ type: 'warning', title: `${m.name} 连通异常`, desc: `模型健康检测失败，请检查配置`, time: '刚刚' });
    }
  });
  if (modelStore.alertRecords.length > 0) {
    items.push({ type: 'warning', title: '预警触发', desc: `共 ${modelStore.alertRecords.length} 条预警记录`, time: '1小时前' });
  }
  if (items.length === 0) {
    items.push({ type: 'info', title: '等待操作', desc: '模型管理操作将在此显示动态记录', time: '' });
  }
  return items;
});

const activityTotalPages = computed(() => Math.max(1, Math.ceil(allActivityItems.value.length / ACTIVITY_PAGE_SIZE)));
const pagedActivityItems = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return allActivityItems.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});
const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const modelAssistantMessage = computed(() => {
  const models = modelStore.models.length;
  if (models === 0) return '尚未配置模型，请点击新增模型按钮添加。';
  if (activeTab.value === 'models') return `已配置 ${models} 个模型，可在列表中管理模型配置和健康状态。`;
  if (activeTab.value === 'usage') return '查看各模型的 Token 消耗趋势和用量占比，掌握成本分布。';
  if (activeTab.value === 'alerts') return '配置各模型的用量预警阈值，及时收到超额提醒。';
  return '查看模型调用日志，追踪每次 API 请求的详细记录。';
});

const modelAssistantButtonText = computed(() => {
  if (activeTab.value === 'models') return '查看用量监控';
  if (activeTab.value === 'usage') return '配置预警设置';
  if (activeTab.value === 'alerts') return '查看调用日志';
  return '返回模型管理';
});

const handleAssistantAction = () => {
  if (activeTab.value === 'models') activeTab.value = 'usage';
  else if (activeTab.value === 'usage') activeTab.value = 'alerts';
  else if (activeTab.value === 'alerts') activeTab.value = 'logs';
  else activeTab.value = 'models';
};

const tabs = [
  { value: "models", label: "模型管理", iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
  { value: "usage", label: "用量监控", iconPath: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  { value: "alerts", label: "预警设置", iconPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
  { value: "logs", label: "调用日志", iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
];

const dashboardCards = computed(() => [
  {
    label: "已配置模型",
    value: modelStore.stats.configuredModels,
    unit: `/${modelStore.stats.totalModels}`,
    iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    iconBg: "linear-gradient(135deg, #DBEAFE, #BFDBFE)",
    iconColor: "#3B82F6",
    badge: modelStore.stats.activeAlerts > 0 ? `${modelStore.stats.activeAlerts}预警` : "正常",
    badgeColor: modelStore.stats.activeAlerts > 0 ? "#F59E0B" : "#10B981",
    badgeBg: modelStore.stats.activeAlerts > 0 ? "#FEF3C7" : "#D1FAE5",
  },
  {
    label: "今日调用",
    value: formatNumber(modelStore.stats.todayCalls),
    unit: "",
    iconPath: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    iconBg: "linear-gradient(135deg, #FCE7F3, #FBCFE8)",
    iconColor: "#EC4899",
    badge: "实时",
    badgeColor: "#8B5CF6",
    badgeBg: "#EDE9FE",
  },
  {
    label: "今日Token",
    value: formatTokens(modelStore.stats.todayTokens),
    unit: "",
    iconPath: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    iconBg: "linear-gradient(135deg, #D1FAE5, #A7F3D0)",
    iconColor: "#10B981",
    badge: "统计",
    badgeColor: "#6366F1",
    badgeBg: "#E0E7FF",
  },
  {
    label: "本月Token",
    value: formatTokens(modelStore.stats.monthTokens),
    unit: "",
    iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    iconBg: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
    iconColor: "#F59E0B",
    badge: "月度",
    badgeColor: "#EC4899",
    badgeBg: "#FCE7F3",
  },
]);

const addForm = ref({
  provider: "",
  name: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  visionModel: "",
  description: "",
  supportsVision: false,
});

const editForm = ref({
  name: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  visionModel: "",
  description: "",
  supportsVision: false,
  healthCheckIntervalDays: 1,
  fallbackProvider: "",
});

const trendChartRef = ref<HTMLElement>();
const pieChartRef = ref<HTMLElement>();
let trendChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;

const PROVIDER_VERSIONS: Record<string, { value: string; label: string; }[]> = {
  dashscope: [
    { value: "qwen-plus", label: "Qwen Plus（通用）" },
    { value: "qwen-turbo", label: "Qwen Turbo（快速）" },
    { value: "qwen-max", label: "Qwen Max（旗舰）" },
    { value: "qwen-long", label: "Qwen Long（长文本）" },
  ],
  zhipu: [
    { value: "glm-4-flash", label: "GLM-4 Flash（快速）" },
    { value: "glm-4-air", label: "GLM-4 Air（均衡）" },
    { value: "glm-4-plus", label: "GLM-4 Plus（专业）" },
    { value: "glm-5", label: "GLM-5（最新）" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "V3 Chat（通用）" },
    { value: "deepseek-v4-flash", label: "V4 Flash（快速）" },
    { value: "deepseek-v4-pro", label: "V4 Pro（专业）" },
    { value: "deepseek-reasoner", label: "R1 推理（深度思考）" },
  ],
};

const MODEL_LOGO_MAP: Record<string, string> = {
  openai: "openai",
  gpt: "openai",
  chatgpt: "openai",
  anthropic: "claude",
  claude: "claude",
  google: "google",
  gemini: "google",
  deepseek: "deepseek",
  qwen: "qwen",
  tongyi: "qwen",
  dashscope: "qwen",
  zhipu: "zhipu",
  chatglm: "zhipu",
  glm: "zhipu",
  baidu: "baidu",
  wenxin: "baidu",
  doubao: "bytedance",
  bytedance: "bytedance",
  moonshot: "moonshot",
  kimi: "moonshot",
  minimax: "minimax",
  hunyuan: "tencent",
  tencent: "tencent",
};

const FALLBACK_ICONS: Record<string, { letter: string; color: string; }> = {
  openai: { letter: "O", color: "#10a37f" },
  claude: { letter: "C", color: "#d97757" },
  google: { letter: "G", color: "#4285f4" },
  deepseek: { letter: "D", color: "#4b6bfb" },
  qwen: { letter: "Q", color: "#6366f1" },
  dashscope: { letter: "Q", color: "#6366f1" },
  zhipu: { letter: "Z", color: "#4268fa" },
  baidu: { letter: "B", color: "#2932e1" },
  bytedance: { letter: "D", color: "#25f4ee" },
  moonshot: { letter: "M", color: "#000" },
  minimax: { letter: "M", color: "#615ced" },
  tencent: { letter: "T", color: "#0052d9" },
};

function getModelSlug(provider: string): string {
  const p = (provider || "").toLowerCase();
  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (p.includes(key)) return slug;
  }
  return "openai";
}

function getModelLogo(provider: string): string {
  const slug = getModelSlug(provider);
  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
}

function getFallbackLetter(provider: string): string {
  const slug = getModelSlug(provider);
  return FALLBACK_ICONS[slug]?.letter || "?";
}

function getFallbackColor(provider: string): string {
  const slug = getModelSlug(provider);
  return FALLBACK_ICONS[slug]?.color || "#94a3b8";
}

function handleLogoError(e: Event) {
  const img = e.target as HTMLImageElement;
  if (!img || !img.parentElement) return;
  img.style.display = "none";
  const fallback = img.parentElement.querySelector(".model-fallback");
  if (fallback) (fallback as HTMLElement).style.display = "flex";
}

function getVersionsForProvider(provider: string) {
  return PROVIDER_VERSIONS[provider] || [];
}

function healthStatusText(status: string) {
  const map: Record<string, string> = { healthy: "正常", degraded: "延迟", unhealthy: "不可用", unknown: "未知" };
  return map[status] || status;
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

function formatTokens(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

async function handleVersionChange(model: ModelItem, newVersion: string) {
  try {
    await modelStore.updateModel(model.id, { model: newVersion });
    MessagePlugin.success(`已切换 ${model.name} 版本为 ${newVersion}`);
  } catch (err: any) {
    MessagePlugin.error(err.message || "切换版本失败");
  }
}

async function handleTestConnection(model: ModelItem) {
  try {
    MessagePlugin.info(`正在测试 ${model.name} 连通性...`);
    const res = await modelStore.testConnection(model.id);
    if (res && res.status === "healthy") {
      MessagePlugin.success(`${model.name} 连通正常，延迟 ${res.latencyMs}ms`);
    } else if (res && res.error) {
      MessagePlugin.warning(`${model.name} 连通异常: ${res.error}`);
    } else {
      MessagePlugin.warning(`${model.name} 连通异常`);
    }
    await modelStore.fetchModels();
  } catch (err: any) {
    MessagePlugin.error(err.message || "测试失败");
  }
}

async function handleDeleteModel(model: ModelItem) {
  try {
    await modelStore.deleteModel(model.id);
    MessagePlugin.success(`已移除 ${model.name}`);
  } catch (err: any) {
    MessagePlugin.error(err.message || "移除失败");
  }
}

function getFallbackModelName(): string {
  if (!editForm.value.fallbackProvider) return '';
  const found = modelStore.models.find(m => m.provider === editForm.value.fallbackProvider);
  return found?.name || '';
}

function openEditDialog(model: ModelItem) {
  editingModelId.value = model.id;
  editForm.value = {
    name: model.name,
    baseUrl: model.baseUrl,
    apiKey: "",
    model: model.model,
    visionModel: model.visionModel,
    description: model.description,
    supportsVision: model.supportsVision,
    healthCheckIntervalDays: model.healthCheckIntervalDays,
    fallbackProvider: model.fallbackProvider,
  };
  showEditDrawer.value = true;
}

async function handleAddModel() {
  try {
    await modelStore.createModel(addForm.value);
    MessagePlugin.success("模型添加成功");
    showAddDrawer.value = false;
    addForm.value = { provider: "", name: "", baseUrl: "", apiKey: "", model: "", visionModel: "", description: "", supportsVision: false };
  } catch (err: any) {
    MessagePlugin.error(err.message || "添加失败");
  }
}

async function handleEditModel() {
  try {
    const data: any = { ...editForm.value };
    if (!data.apiKey) delete data.apiKey;
    await modelStore.updateModel(editingModelId.value, data);
    MessagePlugin.success("模型更新成功");
    showEditDrawer.value = false;
  } catch (err: any) {
    MessagePlugin.error(err.message || "更新失败");
  }
}

async function handleAlertConfigChange(config: AlertConfigItem) {
  try {
    await modelStore.updateAlertConfig(config.id, {
      dailyCallLimit: config.daily_call_limit,
      monthlyTokenLimit: config.monthly_token_limit,
      warningThreshold: config.warning_threshold,
      criticalThreshold: config.critical_threshold,
      enabled: !!config.enabled,
    });
  } catch (err: any) {
    MessagePlugin.error(err.message || "更新预警配置失败");
  }
}

async function handleUsageDateChange() {
  if (usageDateRange.value && usageDateRange.value.length === 2) {
    await modelStore.fetchUsageStats({ startDate: usageDateRange.value[0], endDate: usageDateRange.value[1] });
  } else {
    await modelStore.fetchUsageStats();
  }
  renderCharts();
}

const usageRefreshing = ref(false);

async function refreshUsageStats() {
  usageRefreshing.value = true;
  try {
    if (usageDateRange.value && usageDateRange.value.length === 2) {
      await modelStore.fetchUsageStats({ startDate: usageDateRange.value[0], endDate: usageDateRange.value[1] });
    } else {
      await modelStore.fetchUsageStats();
    }
    await nextTick();
    renderCharts();
  } finally {
    usageRefreshing.value = false;
  }
}

async function handleLogPageChange({ current }: { current: number; }) {
  logPage.value = current;
  await modelStore.fetchUsageLogs({ page: current, pageSize: 20, ...logFilters.value });
}

const usageColumns = [
  {
    colKey: "name", title: "模型", width: 160,
    cell: (h: any, { row }: any) => {
      const logoUrl = getModelLogo(row.provider);
      return h('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
        h('div', {
          style: 'width:22px;height:22px;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;',
        }, [
          h('img', {
            src: logoUrl, alt: row.name,
            style: 'width:100%;height:100%;object-fit:contain;',
            onError: (e: Event) => handleLogoError(e)
          }),
        ]),
        h('span', { style: 'font-weight:500;color:#1e293b;' }, row.name)
      ]);
    }
  },
  { colKey: "total_calls", title: "总调用", width: 100, cell: (_h: any, { row }: any) => formatNumber(row.total_calls) },
  { colKey: "total_tokens", title: "总Token", width: 120, cell: (_h: any, { row }: any) => formatTokens(row.total_tokens) },
  { colKey: "today_calls", title: "今日调用", width: 100, cell: (_h: any, { row }: any) => formatNumber(row.today_calls) },
  { colKey: "today_tokens", title: "今日Token", width: 120, cell: (_h: any, { row }: any) => formatTokens(row.today_tokens) },
  { colKey: "month_tokens", title: "本月Token", width: 120, cell: (_h: any, { row }: any) => formatTokens(row.month_tokens) },
  { colKey: "avg_latency_ms", title: "平均延迟", width: 100, cell: (_h: any, { row }: any) => `${Math.round(row.avg_latency_ms)}ms` },
];

const alertRecordColumns = [
  { colKey: "model_name", title: "模型", width: 100 },
  { colKey: "alert_type", title: "类型", width: 100, cell: (_h: any, { row }: any) => row.alert_type === "daily_call" ? "日调用" : "月Token" },
  { colKey: "level", title: "级别", width: 80, cell: (h: any, { row }: any) => h("t-tag", { props: { theme: row.level === "critical" ? "danger" : "warning", size: "small" } }, row.level === "critical" ? "严重" : "预警") },
  { colKey: "message", title: "消息", ellipsis: true },
  { colKey: "created_at", title: "时间", width: 160 },
];

const logColumns = [
  { colKey: "modelName", title: "模型", width: 100 },
  {
    colKey: "callType", title: "类型", width: 100, cell: (_h: any, { row }: any) => {
      const map: Record<string, string> = { parse_formula: "解析配方", parse_nutrition: "解析营养", natural_search: "自然检索", health_check: "健康检测" };
      return map[row.callType] || row.callType;
    }
  },
  { colKey: "totalTokens", title: "Token", width: 80, cell: (_h: any, { row }: any) => formatTokens(row.totalTokens) },
  { colKey: "latencyMs", title: "耗时", width: 80, cell: (_h: any, { row }: any) => row.latencyMs ? `${row.latencyMs}ms` : "-" },
  {
    colKey: "status", title: "状态", width: 90, cell: (h: any, { row }: any) => {
      const themeMap: Record<string, string> = { success: "success", error: "danger", fallback: "warning" };
      const labelMap: Record<string, string> = { success: "成功", error: "失败", fallback: "切换" };
      return h("t-tag", { props: { theme: themeMap[row.status] || "default", size: "small" } }, labelMap[row.status] || row.status);
    }
  },
  { colKey: "requestSummary", title: "摘要", ellipsis: true },
  { colKey: "createdAt", title: "时间", width: 160 },
];

function renderCharts() {
  const providers = modelStore.models.map(m => m.provider);
  const providerNames: Record<string, string> = {};
  modelStore.models.forEach(m => { providerNames[m.provider] = m.name; });

  const providerColors: Record<string, string> = {
    dashscope: "#FF6B8A",
    zhipu: "#5B8FF9",
    deepseek: "#5AD8A6",
  };

  if (modelStore.usageTrend.length > 0 && trendChartRef.value && trendChartRef.value.parentNode) {
    if (!trendChart) {
      trendChart = echarts.init(trendChartRef.value);
    }
    if (trendChart) {
      trendChart.setOption({
        tooltip: { trigger: "axis" },
        legend: { data: providers.map(p => providerNames[p] || p), bottom: 0 },
        grid: { left: 50, right: 20, top: 10, bottom: 40 },
        xAxis: { type: "category", data: modelStore.usageTrend.map(t => t.date), axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", axisLabel: { fontSize: 11, formatter: (v: number) => formatTokens(v) } },
        series: providers.map(p => ({
          name: providerNames[p] || p,
          type: "line",
          smooth: true,
          data: modelStore.usageTrend.map(t => (t as any)[p] || 0),
          lineStyle: { width: 2 },
          itemStyle: { color: providerColors[p] || "#999" },
          areaStyle: { opacity: 0.1 },
        })),
      });
    }
  }

  if (modelStore.usageDistribution.some(d => d.tokens > 0) && pieChartRef.value && pieChartRef.value.parentNode) {
    if (!pieChart) {
      pieChart = echarts.init(pieChartRef.value);
    }
    if (pieChart) {
      pieChart.setOption({
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: { bottom: 0 },
        series: [{
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: true,
          label: { show: true, formatter: "{b}\n{d}%", fontSize: 12 },
          data: modelStore.usageDistribution.filter(d => d.tokens > 0).map(d => ({
            name: d.name,
            value: d.tokens,
            itemStyle: { color: providerColors[d.provider] || "#999" },
          })),
        }],
      });
    }
  }
}

let resizeHandler: () => void;
let usageRefreshTimer: ReturnType<typeof setInterval> | null = null;
let modelsRefreshTimer: ReturnType<typeof setInterval> | null = null;

const startUsageRefresh = () => {
  stopUsageRefresh();
  usageRefreshTimer = setInterval(async () => {
    if (activeTab.value === 'usage') {
      await modelStore.fetchUsageStats();
      await nextTick();
      renderCharts();
    }
  }, 15000);
};

const stopUsageRefresh = () => {
  if (usageRefreshTimer) {
    clearInterval(usageRefreshTimer);
    usageRefreshTimer = null;
  }
};

const startModelsRefresh = () => {
  stopModelsRefresh();
  modelsRefreshTimer = setInterval(async () => {
    if (activeTab.value === 'models') {
      await modelStore.fetchModels();
    }
  }, 60000);
};

const stopModelsRefresh = () => {
  if (modelsRefreshTimer) {
    clearInterval(modelsRefreshTimer);
    modelsRefreshTimer = null;
  }
};

watch(activeTab, async (tab) => {
  stopUsageRefresh();
  stopModelsRefresh();
  if (tab === "usage") {
    await modelStore.fetchUsageStats();
    await nextTick();
    renderCharts();
    startUsageRefresh();
  } else if (tab === "models") {
    await modelStore.fetchModels();
    startModelsRefresh();
  } else if (tab === "alerts") {
    await modelStore.fetchAlertConfigs();
    await modelStore.fetchAlertRecords();
  } else if (tab === "logs") {
    logPage.value = 1;
    await modelStore.fetchUsageLogs({ page: 1, pageSize: 20 });
  }
});

watch(logFilters, async () => {
  logPage.value = 1;
  await modelStore.fetchUsageLogs({ page: 1, pageSize: 20, ...logFilters.value });
}, { deep: true });

onMounted(async () => {
  await modelStore.fetchModels();
  startModelsRefresh();
  resizeHandler = () => {
    trendChart?.resize();
    pieChart?.resize();
  };
  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  stopUsageRefresh();
  stopModelsRefresh();
  if (trendChart) {
    trendChart.dispose();
    trendChart = null;
  }
  if (pieChart) {
    pieChart.dispose();
    pieChart = null;
  }
  window.removeEventListener("resize", resizeHandler);
});
</script>

<style scoped lang="scss">
$overlay-emerald-04: rgba(16, 185, 129, 0.04);
$overlay-emerald-08: rgba(16, 185, 129, 0.08);
$overlay-emerald-12: rgba(16, 185, 129, 0.12);
$overlay-emerald-15: rgba(16, 185, 129, 0.15);
$overlay-emerald-25: rgba(16, 185, 129, 0.25);
$overlay-emerald-35: rgba(16, 185, 129, 0.35);
$overlay-white-15: rgba(255, 255, 255, 0.15);
$overlay-white-20: rgba(255, 255, 255, 0.2);
$overlay-white-30: rgba(255, 255, 255, 0.3);
$transition-fast: 0.15s ease;
$transition-normal: 0.25s ease;

.model-management {
  width: 100%;

  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);
  --td-brand-color-light: var(--color-primary-bg);
  --td-brand-color-focus: var(--overlay-brand-30);
  --td-brand-color-disabled: var(--color-primary-lighter);
  --td-brand-color-border-active: var(--color-primary);
  --td-brand-color-border-hover: var(--color-primary-dark);
  --td-brand-color-border-focus: var(--color-primary);
}

@keyframes dashboard-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 30px;

  .stat-card {
    background: #fff;
    padding: 24px;
    border-radius: 24px;
    border: 1px solid #fff;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    animation: dashboard-fade-in 0.5s ease forwards;
    opacity: 0;

    &:hover {
      border-color: #DBEAFE;
      transform: translateY(-2px);
      box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
    }

    .stat-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 8px;
      white-space: nowrap;
    }

    .stat-label {
      font-size: 14px;
      color: #94A3B8;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.2;

      .stat-unit {
        font-size: 14px;
        font-weight: 400;
        color: #94A3B8;
      }
    }
  }
}

.content-card {
  min-height: 500px;
  border-radius: 24px !important;
  overflow: hidden;
  border: none;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);

  :deep(.t-card__body) {
    padding: 0;
  }
}

.data-center-toolbar {
  padding: 28px 32px;
  border-bottom: 1px solid #f8fafc;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  position: relative;
  min-height: 80px;

  .toolbar-left-section {
    flex: 1;
    min-width: 240px;

    .toolbar-title-section {
      .toolbar-title {
        font-size: 20px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 4px 0;
        display: flex;
        align-items: center;
      }

      .toolbar-subtitle {
        font-size: 14px;
        color: #94a3b8;
        margin: 0;
      }
    }
  }

  .toolbar-right-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.add-model-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #1e293b;
  color: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15);
  border: none;
  cursor: pointer;

  &:hover {
    background-color: #334155;
  }

  &:active {
    background-color: #0f172a;
    transform: scale(0.98);
  }

  &:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }

  .add-icon {
    font-size: 18px;
    transition: transform 0.2s;
  }

  &:hover .add-icon {
    transform: rotate(90deg);
  }
}

.mm-body {
  display: flex;
  gap: 0;
  min-height: 480px;
}

.mm-nav {
  width: 170px;
  flex-shrink: 0;
  padding: 24px 12px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;

  &--collapsed {
    width: 56px;
    padding: 24px 6px;

    .nav-tab {
      justify-content: center;
      padding: 12px 0;

      .nav-tab-icon {
        width: 24px;
        height: 24px;
      }

      .nav-tab-label {
        display: none;
      }
    }

    .nav-collapse-btn {
      margin: 0 auto;
      width: 36px;
      height: 36px;
    }
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid transparent;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;

    .nav-tab-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover {
      background: #f1f5f9;
      color: #334155;
    }

    &.active {
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      box-shadow: 0 4px 12px $overlay-emerald-25;
      border-color: transparent;
      font-weight: 600;
    }

    .nav-tab-label {
      flex: 1;
      transition: opacity 0.2s ease;
    }
  }

  .nav-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: auto;
    color: #94a3b8;

    &:hover {
      background: #f1f5f9;
      color: #475569;
      border-color: #cbd5e1;
    }
  }
}

.mm-content {
  flex: 1;
  min-width: 0;
  padding: 24px 28px;
  border-left: 1px solid #f1f5f9;
}

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.2s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

.tab-panel {
  animation: dashboard-fade-in 0.3s ease forwards;
}

.data-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 8px;

  .data-empty-text {
    font-size: 14px;
    color: #94a3b8;
    font-weight: 500;
    margin: 0;
  }

  .data-empty-hint {
    font-size: 12px;
    color: #cbd5e1;
    margin: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }
}

.section-header-enhanced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  &.section-header-inline {
    margin-bottom: 12px;
  }

  .section-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title-icon {
    flex-shrink: 0;
  }

  .section-title-text {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;

    &--sm {
      font-size: 14px;
    }
  }

  .section-title-count {
    font-size: 13px;
    color: #94a3b8;
    font-weight: 500;
  }

  .date-range {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.refresh-usage-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  white-space: nowrap;

  svg {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #1e293b;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0) scale(0.97);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }

  &--spinning {
    pointer-events: none;
    color: #3b82f6;
    border-color: #bfdbfe;
    background: #eff6ff;

    svg {
      animation: refresh-spin 0.8s linear infinite;
    }
  }
}

@keyframes refresh-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.model-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    border-color: #e2e8f0;
    transform: translateY(-1px);
  }

  .model-card-header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid #f8fafc;

    .model-name-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .model-logo-wrap {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 8px;
      background: #f8fafc;
      overflow: hidden;

      .model-logo {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .model-fallback {
        display: none;
        position: absolute;
        inset: 0;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        background: #f1f5f9;
        border-radius: 8px;
      }
    }

    .model-name {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }

    .health-dot {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 600;
      margin-left: auto;
      letter-spacing: 0.3px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;

      &.healthy {
        background: #D1FAE5;
        color: #059669;

        &::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
        }
      }

      &.degraded {
        background: #FEF3C7;
        color: #D97706;

        &::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #F59E0B;
        }
      }

      &.unhealthy {
        background: #FEE2E2;
        color: #DC2626;

        &::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #EF4444;
        }
      }

      &.unknown {
        background: #F1F5F9;
        color: #64748B;

        &::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94A3B8;
        }
      }
    }

    .model-provider {
      font-size: 12px;
      color: #94a3b8;
      padding-left: 38px;
    }
  }

  .model-card-body {
    padding: 12px 20px;
  }

  .model-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    gap: 8px;

    .field-label {
      font-size: 13px;
      color: #94a3b8;
      white-space: nowrap;
    }

    .field-value {
      font-size: 13px;
      color: #1e293b;
      font-weight: 500;

      &.configured {
        color: #059669;
      }

      &.not-configured {
        color: #DC2626;
      }
    }
  }

  .model-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    border-top: 1px solid #f8fafc;
    background: #fafbfc;

    .model-usage-mini {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #94a3b8;
    }

    .model-actions {
      display: flex;
      gap: 4px;
    }
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.chart-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  padding: 20px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 12px 0;
  }

  .chart-container {
    height: 280px;
  }

  .chart-empty {
    height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    margin-top: 8px;

    .chart-empty-icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      margin-bottom: 4px;
    }

    .chart-empty-text {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
      margin: 0;
    }

    .chart-empty-hint {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }

    .chart-empty-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #64748b;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 4px;
      transition: all 0.2s;

      &:hover {
        background: #f8fafc;
        color: #334155;
        border-color: #cbd5e1;
      }
    }
  }
}

.usage-table-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  padding: 20px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 12px 0;
  }
}

.alert-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.alert-config-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  padding: 20px 24px;
  overflow: visible;

  .alert-config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .alert-config-name-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .alert-config-model-name {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }
  }

  .alert-config-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    overflow: visible;
  }

  .alert-config-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;

    .field-label {
      font-size: 12px;
      color: #94a3b8;
    }

    .field-input-with-unit {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;

      :deep(.t-input-number) {
        flex: 1;
        min-width: 0;
      }

      .field-unit {
        font-size: 12px;
        color: #64748b;
        font-weight: 500;
        white-space: nowrap;
        flex-shrink: 0;
      }
    }
  }
}

.model-logo-wrap--sm {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

:deep(.t-drawer__body) {
  overflow-x: hidden;
}

.model-drawer {
  :deep(.drawer-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .header-title {
        font-size: 17px;
        font-weight: 600;
        color: #1e293b;
      }
    }

    .header-actions {
      .confirm-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;

        &.create-btn {
          background: #10b981;
          color: #fff;

          &:hover {
            background: #059669;
          }
        }

        &.update-btn {
          background: #3b82f6;
          color: #fff;

          &:hover {
            background: #2563eb;
          }
        }

        svg {
          flex-shrink: 0;
        }
      }
    }
  }

  .drawer-card {
    margin-bottom: 16px;
    border: 1px solid #f1f5f9;
    border-radius: 12px;
    overflow: hidden;

    &:last-child {
      margin-bottom: 0;
    }

    &.info-card {
      border-left: 3px solid #10b981;
    }

    &.api-card {
      border-left: 3px solid #3b82f6;
    }

    &.param-card {
      border-left: 3px solid #f59e0b;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;

      span {
        font-size: 14px;
        font-weight: 600;
        color: #334155;
      }
    }

    .card-body {
      padding: 16px;

      :deep(.t-form__item) {
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .form-row {
        display: flex;
        gap: 16px;

        &.two-col > * {
          flex: 1;
          min-width: 0;
        }
      }

      .fallback-model-field {
        display: flex;
        align-items: center;
        gap: 10px;

        .fallback-logo-wrap {
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 8px;
          background: #f8fafc;
          overflow: hidden;

          .fallback-logo {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .model-fallback {
            display: none;
            position: absolute;
            inset: 0;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            background: #f1f5f9;
            border-radius: 8px;
          }
        }
      }
    }
  }
}

.log-filters {
  display: flex;
  gap: 8px;
}

@media screen and (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .model-grid {
    grid-template-columns: 1fr;
  }

  .alert-config-grid {
    grid-template-columns: 1fr;
  }

  .mm-nav {
    width: 56px;
    padding: 24px 6px;

    .nav-tab {
      justify-content: center;
      padding: 12px 0;

      .nav-tab-icon {
        width: 24px;
        height: 24px;
      }

      .nav-tab-label {
        display: none;
      }
    }

    .nav-collapse-btn {
      display: none;
    }
  }
}

.activity-section {
  margin-top: 30px;
  padding-bottom: 32px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
}

.activity-card {
  background-color: #fff;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid #f8fafc;

  &--assistant {
    background: linear-gradient(135deg, #10B981, #059669);
    border: none;
    color: #fff;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px $overlay-emerald-15, 0 10px 10px -5px $overlay-emerald-04;
  }
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.activity-title {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: #e2e8f0;
    color: #334155;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.activity-nav-page {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  min-width: 40px;
  text-align: center;
}

.timeline-list {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: #e2e8f0;
    border-radius: 1px;
  }
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 20px;

  &--last {
    padding-bottom: 0;
  }
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  background: #fff;
  border: 2px solid #e2e8f0;

  &--success {
    border-color: #10b981;

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }
  }

  &--info {
    border-color: #3b82f6;

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
    }
  }

  &--warning {
    border-color: #f59e0b;

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
    }
  }
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.timeline-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 4px 0;
}

.timeline-time {
  font-size: 12px;
  color: #94a3b8;
}

.assistant-content {
  position: relative;
  z-index: 1;
}

.assistant-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.assistant-desc {
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.6;
  margin: 0 0 20px 0;
  min-height: 42px;
}

.assistant-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border-radius: 12px;
  background: $overlay-white-20;
  backdrop-filter: blur(10px);
  border: 1px solid $overlay-white-30;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-normal;

  &:hover {
    background: $overlay-white-30;
    transform: translateY(-2px);
  }
}

.assistant-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid $overlay-white-15;
}

.assistant-avatar-group {
  display: flex;
  gap: 6px;
}

.assistant-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: $overlay-white-20;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(4px);
}

.assistant-hint {
  font-size: 12px;
  opacity: 0.75;
}

.assistant-bg-icon {
  position: absolute;
  right: -10px;
  bottom: -10px;
  opacity: 0.08;
  transform: rotate(-15deg);
}

@media screen and (max-width: 1024px) {
  .activity-section {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 640px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .data-center-toolbar {
    padding: 20px 16px;
  }

  .mm-body {
    flex-direction: column;
  }

  .mm-nav {
    width: 100%;
    flex-direction: row;
    padding: 12px;
    overflow-x: auto;

    .nav-tab {
      margin-bottom: 0;
      margin-right: 8px;
      padding: 8px 14px;
      white-space: nowrap;

      .nav-tab-label {
        display: inline;
      }
    }

    .nav-collapse-btn {
      display: none;
    }
  }

  .mm-content {
    border-left: none;
    border-top: 1px solid #f1f5f9;
    padding: 16px;
  }

  .activity-section {
    grid-template-columns: 1fr;
  }
}
</style>
