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
                      <span class="field-label">可用版本</span>
                      <t-select v-model="model.model" :disabled="!isAdmin" size="small" style="flex: 1"
                        @change="(val: any) => handleVersionChange(model, String(val))">
                        <t-option v-for="v in getAvailableVersionsForProvider(model)" :key="v.value" :value="v.value"
                          :label="v.label" :disabled="v.value === model.model">
                          <span style="display:inline-flex;align-items:center;gap:4px;">
                            {{ v.label }}
                            <svg v-if="v.value === model.model" width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        </t-option>
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
            <!-- 模型应用 -->
            <div v-else-if="activeTab === 'applications'" key="applications" class="tab-panel">
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path
                      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <h4 class="section-title-text">功能模块模型配置</h4>
                </div>
                <span class="section-title-count">共 {{ modelApplications.length }} 个配置</span>
              </div>

              <div v-if="isAdmin" class="app-actions-bar">
                <button class="add-app-btn" @click="showAddAppDialog = true">
                  <t-icon name="add" />
                  添加配置
                </button>
              </div>

              <div v-if="modelApplications.length === 0" class="empty-state">
                <div class="empty-icon-wrap">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path
                      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <p class="empty-text">暂无功能模块配置</p>
                <p class="empty-hint">为系统中的AI功能模块配置专属模型</p>
                <button v-if="isAdmin" class="empty-action-btn" @click="showAddAppDialog = true">
                  <t-icon name="add" />
                  添加第一个配置
                </button>
              </div>

              <div v-else class="applications-grid">
                <div v-for="app in modelApplications" :key="app.id" class="application-card">
                  <div class="application-card-header">
                    <div class="app-module-info">
                      <div class="app-module-icon" :style="{ background: getModuleIconBg(app.module) }">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                          v-html="getModuleIcon(app.module)"></svg>
                      </div>
                      <div class="app-module-details">
                        <h5 class="app-module-name">{{ app.moduleName || getModuleDisplayName(app.module) }}</h5>
                        <span class="app-module-id">{{ app.module }}</span>
                      </div>
                    </div>
                    <div :class="['app-status-badge', app.enabled ? 'enabled' : 'disabled']">
                      {{ app.enabled ? '已启用' : '已禁用' }}
                    </div>
                  </div>

                  <div class="application-card-body">
                    <div class="app-field">
                      <span class="field-label">模型厂商</span>
                      <div class="model-provider-display">
                        <div class="model-logo-wrap-sm">
                          <img loading="lazy" :src="getModelLogo(app.provider)" :alt="app.provider"
                            class="model-logo-sm" @error="(e: Event) => handleLogoError(e)" />
                          <span class="model-fallback-sm" :style="{ color: getFallbackColor(app.provider) }">
                            {{ getFallbackLetter(app.provider) }}
                          </span>
                        </div>
                        <span class="provider-name">{{ getModelNameByProvider(app.provider) }}</span>
                      </div>
                    </div>

                    <div class="app-field">
                      <span class="field-label">模型类型</span>
                      <span class="field-value">{{ app.model }}</span>
                    </div>

                    <div v-if="app.description" class="app-field">
                      <span class="field-label">描述说明</span>
                      <span class="field-value field-value--desc">{{ app.description }}</span>
                    </div>

                    <div class="app-field">
                      <span class="field-label">更新时间</span>
                      <span class="field-value">{{ formatDateTime(app.updatedAt) }}</span>
                    </div>
                  </div>

                  <div class="application-card-footer">
                    <div v-if="isAdmin" class="app-actions">
                      <t-button size="small" variant="text" @click="openEditAppDialog(app)">
                        编辑
                      </t-button>
                      <t-button size="small" variant="text" @click="toggleAppStatus(app)">
                        {{ app.enabled ? '禁用' : '启用' }}
                      </t-button>
                      <t-popconfirm content="确认删除此配置？" @confirm="deleteApplication(app.id)">
                        <t-button size="small" variant="text" theme="danger">删除</t-button>
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
                  <div v-if="usageLoading" class="chart-loading">
                    <div class="chart-loading-spinner"></div>
                    <p class="chart-loading-text">正在加载Token消耗数据...</p>
                  </div>
                  <div v-else-if="modelStore.usageTrend.length > 0" ref="trendChartRef" class="chart-container"></div>
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
                  <div v-if="usageLoading" class="chart-loading">
                    <div class="chart-loading-spinner"></div>
                    <p class="chart-loading-text">正在加载用量占比数据...</p>
                  </div>
                  <div v-else-if="modelStore.usageDistribution.some(d => d.tokens > 0)" ref="pieChartRef"
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
                    <t-option value="dashboard_chat" label="AI对话" />
                    <t-option value="agent_chat" label="Agent对话" />
                    <t-option value="parse_file_image" label="图片内容提取" />
                  </t-select>
                  <t-select v-model="logFilters.status" placeholder="状态" clearable size="small" style="width: 100px">
                    <t-option value="success" label="成功" />
                    <t-option value="error" label="失败" />
                    <t-option value="fallback" label="自动切换" />
                  </t-select>
                </div>
              </div>
              <t-table v-if="modelStore.usageLogs.length > 0" :data="modelStore.usageLogs" :columns="logColumns"
                size="small" row-key="id" :pagination="null" />
              <div v-if="modelStore.usageLogs.length > 0" class="log-table-pagination">
                <div class="pagination-info">
                  显示第 {{ (logPage - 1) * logPageSize + 1 }}-{{
                    Math.min(logPage * logPageSize, modelStore.usageLogsTotal) }} 条，
                  共 {{ modelStore.usageLogsTotal }} 条数据
                </div>
                <div class="pagination-controls">
                  <button class="pagination-btn" :class="{ 'pagination-btn--disabled': logPage === 1 }"
                    :disabled="logPage === 1" @click="goLogPage(logPage - 1)">上一页</button>
                  <template v-for="page in logPageNumbers" :key="page">
                    <button v-if="page !== '...'" class="pagination-btn"
                      :class="{ 'pagination-btn--active': page === logPage }"
                      @click="typeof page === 'number' && goLogPage(page)">{{ page }}</button>
                    <span v-else class="pagination-ellipsis">...</span>
                  </template>
                  <button class="pagination-btn" :class="{ 'pagination-btn--disabled': logPage === logTotalPages }"
                    :disabled="logPage === logTotalPages" @click="goLogPage(logPage + 1)">下一页</button>
                </div>
              </div>
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

            <div v-else-if="activeTab === 'float-agent'" key="float-agent" class="tab-panel">
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#ff6b8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                  <h4 class="section-title-text">悬浮助手配置</h4>
                </div>
              </div>

              <div class="float-agent-config">
                <div class="fa-card">
                  <div class="fa-card-header">
                    <div class="fa-card-header-left">
                      <svg class="fa-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span class="fa-card-title">基本配置</span>
                    </div>
                    <t-switch v-model="floatConfig.enabled" size="small" @change="saveFloatConfig('enabled')" />
                  </div>
                  <div class="fa-card-body">
                    <div class="fa-field">
                      <span class="fa-field-label">AI 模型</span>
                      <t-select v-model="floatModelKey" placeholder="选择模型" size="small" style="width: 100%"
                        @change="onFloatModelChange">
                        <t-option-group v-for="group in allFloatModelGroups" :key="group.provider" :label="group.name">
                          <t-option v-for="v in group.versions" :key="v.value" :value="v.value" :label="v.label" />
                        </t-option-group>
                      </t-select>
                    </div>
                    <div class="fa-field">
                      <span class="fa-field-label">备用模型</span>
                      <t-select v-model="floatFallbackModelKey" placeholder="可选" clearable size="small"
                        style="width: 100%" @change="onFloatFallbackModelChange">
                        <t-option-group v-for="group in allFloatModelGroups" :key="group.provider" :label="group.name">
                          <t-option v-for="v in group.versions" :key="v.value" :value="v.value" :label="v.label" />
                        </t-option-group>
                      </t-select>
                    </div>
                  </div>
                </div>

                <div class="fa-card">
                  <div class="fa-card-header">
                    <div class="fa-card-header-left">
                      <svg class="fa-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      <span class="fa-card-title">外观设置</span>
                    </div>
                  </div>
                  <div class="fa-card-body">
                    <div class="fa-field">
                      <span class="fa-field-label">悬浮球位置</span>
                      <div class="fa-toggle-group" @change="(e: any) => { if (e?.target?.value) floatConfig.position = e.target.value; saveFloatConfig('position'); }">
                        <button type="button" class="fa-toggle-btn" :class="{ active: floatConfig.position === 'right' }"
                          @click="floatConfig.position = 'right'; saveFloatConfig('position')">
                          右侧
                        </button>
                        <button type="button" class="fa-toggle-btn" :class="{ active: floatConfig.position === 'left' }"
                          @click="floatConfig.position = 'left'; saveFloatConfig('position')">
                          左侧
                        </button>
                      </div>
                    </div>
                    <div class="fa-field">
                      <span class="fa-field-label">抽屉宽度</span>
                      <t-input-number v-model="floatConfig.drawerWidth" :min="320" :max="600" :step="10" size="small"
                        theme="normal" style="width: 180px" @change="saveFloatConfig('drawerWidth')" />
                    </div>
                    <div class="fa-field">
                      <span class="fa-field-label">主题色</span>
                      <t-input v-model="floatConfig.themeColor" placeholder="默认跟随品牌色" clearable size="small"
                        style="width: 180px" @change="saveFloatConfig('themeColor')" />
                    </div>
                    <div class="fa-field">
                      <span class="fa-field-label">呼吸脉冲</span>
                      <t-switch v-model="floatConfig.showPulse" size="small" @change="saveFloatConfig('showPulse')" />
                    </div>
                  </div>
                </div>

                <div class="fa-card">
                  <div class="fa-card-header">
                    <div class="fa-card-header-left">
                      <svg class="fa-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                      <span class="fa-card-title">行为策略</span>
                    </div>
                  </div>
                  <div class="fa-card-body">
                    <div class="fa-field fa-field--block">
                      <span class="fa-field-label">启用页面</span>
                      <t-checkbox-group v-model="floatConfig.enabledPages" @change="(val: any) => saveFloatConfig('enabledPages', val)">
                        <t-checkbox value="formula-add">新增配方</t-checkbox>
                        <t-checkbox value="formula-edit">编辑配方</t-checkbox>
                        <t-checkbox value="material-add">新增原料</t-checkbox>
                        <t-checkbox value="material-edit">编辑原料</t-checkbox>
                        <t-checkbox value="salesman-add">新增业务员</t-checkbox>
                        <t-checkbox value="salesman-edit">编辑业务员</t-checkbox>
                      </t-checkbox-group>
                    </div>
                    <div class="fa-field">
                      <span class="fa-field-label">最大对话轮次</span>
                      <t-input-number v-model="floatConfig.maxRounds" :min="3" :max="30" :step="1" size="small"
                        theme="normal" style="width: 180px" @change="saveFloatConfig('maxRounds')" />
                    </div>
                    <div class="fa-field">
                      <span class="fa-field-label">回填策略</span>
                      <div class="fa-toggle-group">
                        <button type="button" class="fa-toggle-btn" :class="{ active: floatConfig.fillStrategy === 'overwrite' }"
                          @click="floatConfig.fillStrategy = 'overwrite'; saveFloatConfig('fillStrategy')">
                          覆盖填充
                        </button>
                        <button type="button" class="fa-toggle-btn" :class="{ active: floatConfig.fillStrategy === 'preserve' }"
                          @click="floatConfig.fillStrategy = 'preserve'; saveFloatConfig('fillStrategy')">
                          仅填空值
                        </button>
                      </div>
                    </div>
                    <div class="fa-field">
                      <span class="fa-field-label">上下文模式</span>
                      <div class="fa-toggle-group">
                        <button type="button" class="fa-toggle-btn" :class="{ active: floatConfig.contextMode === 'page' }"
                          @click="floatConfig.contextMode = 'page'; saveFloatConfig('contextMode')">
                          按页面隔离
                        </button>
                        <button type="button" class="fa-toggle-btn" :class="{ active: floatConfig.contextMode === 'clear' }"
                          @click="floatConfig.contextMode = 'clear'; saveFloatConfig('contextMode')">
                          每次清空
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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

      <t-dialog v-model:visible="showAddAppDialog" :confirm-btn="null" :cancel-btn="null" width="560px"
        class="app-dialog" destroy-on-close>
        <template #header>
          <div class="app-dialog-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>添加功能模块配置</span>
          </div>
        </template>
        <t-form ref="addAppFormRef" :data="appFormData" :rules="appFormRules" label-width="100px"
          @submit="submitAddApp">
          <t-form-item label="功能模块" name="module">
            <t-select v-model="appFormData.module" placeholder="请选择功能模块" clearable>
              <t-option v-for="mod in availableModules" :key="mod.value" :value="mod.value" :label="mod.label">
                <span style="display: flex; align-items: center; gap: 8px;">
                  {{ mod.label }}
                  <small style="color: #94a3b8;">({{ mod.value }})</small>
                </span>
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item label="模型厂商" name="provider">
            <t-select v-model="appFormData.provider" placeholder="请选择模型厂商" clearable @change="handleAppProviderChange">
              <t-option v-for="model in modelStore.models" :key="model.provider" :value="model.provider"
                :label="model.name">
                <template #default>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div :style="{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: getFallbackColor(model.provider) + '18',
                      flexShrink: 0
                    }">
                      <img :src="getModelLogo(model.provider)" :alt="model.name"
                        style="width: 100%; height: 100%; object-fit: contain; display: block;"
                        @error="(e: Event) => { (e.target as HTMLElement).style.display = 'none'; }" />
                    </div>
                    <span style="font-size: 14px; color: #1e293b;">{{ model.name }}</span>
                  </div>
                </template>
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item label="模型类型" name="model">
            <t-select v-model="appFormData.model" placeholder="请选择模型类型" clearable>
              <t-option v-for="ver in getAvailableVersionsForProviderByString(appFormData.provider)" :key="ver.value"
                :value="ver.value" :label="ver.label" />
            </t-select>
          </t-form-item>
          <t-form-item label="描述说明" name="description">
            <t-textarea v-model="appFormData.description" placeholder="可选：配置描述说明"
              :autosize="{ minRows: 2, maxRows: 4 }" />
          </t-form-item>
          <t-form-item label="启用状态">
            <t-switch v-model="appFormData.enabled" />
          </t-form-item>
        </t-form>
        <template #footer>
          <div class="dialog-footer">
            <button type="button" class="dialog-cancel-btn" @click="showAddAppDialog = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              取消
            </button>
            <button type="button" class="app-confirm-btn" :disabled="appSubmitting" @click="submitAddApp">
              <t-loading v-if="appSubmitting" size="14px" />
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              确认添加
            </button>
          </div>
        </template>
      </t-dialog>

      <t-dialog v-model:visible="showEditAppDialog" :confirm-btn="null" :cancel-btn="null" width="560px"
        class="app-dialog" destroy-on-close>
        <template #header>
          <div class="app-dialog-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>编辑功能模块配置</span>
          </div>
        </template>
        <t-form ref="editAppFormRef" :data="editAppFormData" :rules="appFormRules" label-width="100px"
          @submit="submitEditApp">
          <t-form-item label="功能模块" name="module">
            <t-input v-model="editAppFormData.module" disabled />
          </t-form-item>
          <t-form-item label="模型厂商" name="provider">
            <t-select v-model="editAppFormData.provider" placeholder="请选择模型厂商" clearable
              @change="handleEditAppProviderChange">
              <t-option v-for="model in modelStore.models" :key="model.provider" :value="model.provider"
                :label="model.name">
                <template #default>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div :style="{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: getFallbackColor(model.provider) + '18',
                      flexShrink: 0
                    }">
                      <img :src="getModelLogo(model.provider)" :alt="model.name"
                        style="width: 100%; height: 100%; object-fit: contain; display: block;"
                        @error="(e: Event) => { (e.target as HTMLElement).style.display = 'none'; }" />
                    </div>
                    <span style="font-size: 14px; color: #1e293b;">{{ model.name }}</span>
                  </div>
                </template>
              </t-option>
            </t-select>
          </t-form-item>
          <t-form-item label="模型类型" name="model">
            <t-select v-model="editAppFormData.model" placeholder="请选择模型类型" clearable>
              <t-option v-for="ver in getAvailableVersionsForProviderByString(editAppFormData.provider)"
                :key="ver.value" :value="ver.value" :label="ver.label" />
            </t-select>
          </t-form-item>
          <t-form-item label="描述说明" name="description">
            <t-textarea v-model="editAppFormData.description" placeholder="可选：配置描述说明"
              :autosize="{ minRows: 2, maxRows: 4 }" />
          </t-form-item>
          <t-form-item label="启用状态">
            <t-switch v-model="editAppFormData.enabled" />
          </t-form-item>
        </t-form>
        <template #footer>
          <div class="dialog-footer">
            <button type="button" class="dialog-cancel-btn" @click="showEditAppDialog = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              取消
            </button>
            <button type="button" class="app-confirm-btn" :disabled="appSubmitting" @click="submitEditApp">
              <t-loading v-if="appSubmitting" size="14px" />
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              保存修改
            </button>
          </div>
        </template>
      </t-dialog>
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
            <button class="confirm-btn" :class="[addSubmitting ? 'loading' : '', 'create-btn']" @click="handleAddModel"
              :disabled="addSubmitting">
              <t-loading v-if="addSubmitting" size="14px" />
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
            <t-form-item label="API 基础地址">
              <t-input v-model="addForm.baseUrl" placeholder="https://api.example.com/v1" />
            </t-form-item>
            <t-form-item label="API Key">
              <t-input v-model="addForm.apiKey" type="password" placeholder="sk-..." />
            </t-form-item>
          </div>
        </div>
        <div class="drawer-card param-card">
          <div class="card-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
            <button class="confirm-btn" :class="[editSubmitting ? 'loading' : '', 'update-btn']"
              @click="handleEditModel" :disabled="editSubmitting">
              <t-loading v-if="editSubmitting" size="14px" />
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
              <t-form-item>
                <template #label>显示名称<span class="required-mark">*</span></template>
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
            <t-form-item>
              <template #label>API 基础地址<span class="required-mark">*</span></template>
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
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>模型参数</span>
          </div>
          <div class="card-body">
            <div class="form-row two-col">
              <t-form-item>
                <template #label>默认模型版本<span class="required-mark">*</span></template>
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
              <t-select v-model="editForm.fallbackProvider" clearable placeholder="选择备用模型" style="width: 100%">
                <template #valueDisplay="{ value }">
                  <div v-if="value" class="select-value-with-logo">
                    <img loading="lazy" :src="getModelLogo(value)" :alt="getFallbackModelName()"
                      class="fallback-logo-sm" @error="(e: Event) => handleLogoError(e)" />
                    <span>{{ getFallbackModelName() }}</span>
                  </div>
                </template>
                <t-option v-for="m in modelStore.models.filter(x => x.id !== editingModelId)" :key="m.provider"
                  :value="m.provider" :label="m.name">
                  <template #default>
                    <div class="option-with-logo" style="display:flex;align-items:flex-end;gap:14px;">
                      <img loading="lazy" :src="getModelLogo(m.provider)" :alt="m.name" class="fallback-logo-sm"
                        @error="(e: Event) => handleLogoError(e)"
                        style="width:16px;height:16px;border-radius:4px;object-fit:contain;flex-shrink:0;padding-bottom:2px;" />
                      <span style="line-height:1.4;font-size:14px;">{{ m.name }}</span>
                    </div>
                  </template>
                </t-option>
              </t-select>
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
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useModelStore } from "@/stores/model";
import { useAuthStore } from "@/stores/auth";
import type { ModelItem, AlertConfigItem } from "@/api/model";
import { modelApi, type ModelVersionOption } from "@/api/model";
import { agentApi } from "@/api/agent";
import * as echarts from "echarts";

const modelStore = useModelStore();
const authStore = useAuthStore();

const isAdmin = computed(() => authStore.user?.role === "admin");
const activeTab = ref("models");
const navCollapsed = ref(false);

const floatConfig = reactive({
  enabled: true,
  model: "deepseek",
  modelName: "",
  fallbackModel: "",
  fallbackModelName: "",
  position: "right" as "right" | "left",
  drawerWidth: 400,
  themeColor: "",
  showPulse: true,
  enabledPages: [] as string[],
  maxRounds: 10,
  fillStrategy: "overwrite" as "overwrite" | "preserve",
  contextMode: "page" as "page" | "clear",
});


interface FloatModelGroup {
  provider: string;
  name: string;
  versions: ModelVersionOption[];
}

const allFloatModelGroups = ref<FloatModelGroup[]>([]);

async function loadAllFloatModelGroups() {
  const groups: FloatModelGroup[] = [];
  for (const m of modelStore.models) {
    try {
      const res = await modelApi.getVersionsByProvider(m.provider);
      const versions = res.versions || [];
      if (versions.length > 0) {
        groups.push({ provider: m.provider, name: m.name, versions });
      }
    } catch {
      // skip
    }
  }
  allFloatModelGroups.value = groups;
}

const floatModelKey = computed({
  get: () => floatConfig.model && floatConfig.modelName ? `${floatConfig.model}|${floatConfig.modelName}` : "",
  set: () => {},
});

const floatFallbackModelKey = computed({
  get: () => floatConfig.fallbackModel && floatConfig.fallbackModelName ? `${floatConfig.fallbackModel}|${floatConfig.fallbackModelName}` : "",
  set: () => {},
});

function onFloatModelChange(val: string) {
  if (!val) {
    floatConfig.modelName = "";
    saveFloatConfig("modelName", "");
    return;
  }
  const [provider, modelName] = val.split("|");
  floatConfig.model = provider;
  floatConfig.modelName = modelName;
  saveFloatConfig("model", provider);
  saveFloatConfig("modelName", modelName);
}

function onFloatFallbackModelChange(val: string) {
  if (!val) {
    floatConfig.fallbackModel = "";
    floatConfig.fallbackModelName = "";
    saveFloatConfig("fallbackModel", "");
    saveFloatConfig("fallbackModelName", "");
    return;
  }
  const [provider, modelName] = val.split("|");
  floatConfig.fallbackModel = provider;
  floatConfig.fallbackModelName = modelName;
  saveFloatConfig("fallbackModel", provider);
  saveFloatConfig("fallbackModelName", modelName);
}

async function loadFloatConfig() {
  try {
    const data = await agentApi.getFloatConfig();
    if (data) {
      Object.assign(floatConfig, {
        enabled: data.enabled,
        model: data.model,
        modelName: data.modelName || "",
        fallbackModel: data.fallbackModel,
        fallbackModelName: data.fallbackModelName || "",
        position: data.position,
        drawerWidth: data.drawerWidth,
        themeColor: data.themeColor,
        showPulse: data.showPulse,
        enabledPages: data.enabledPages,
        maxRounds: data.maxRounds,
        fillStrategy: data.fillStrategy,
        contextMode: data.contextMode,
      });
    }
    await loadAllFloatModelGroups();
  } catch (e) {
    console.error("[FloatAgentConfig] 加载失败:", e);
  }
}

async function saveFloatConfig(field: string, eventValue?: any) {
  try {
    const data: Record<string, any> = {};
    data[field] = eventValue !== undefined ? eventValue : (floatConfig as any)[field];
    await agentApi.updateFloatConfig(data as any);
    MessagePlugin.success("配置已保存");
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || "保存失败";
    console.error(`[FloatAgentConfig] 保存 ${field} 失败:`, msg, e);
    MessagePlugin.error(msg);
  }
}
const showAddDrawer = ref(false);
const showEditDrawer = ref(false);
const addSubmitting = ref(false);
const editSubmitting = ref(false);
const editingModelId = ref("");
const usageDateRange = ref<string[]>([]);
const logPage = ref(1);
const logPageSize = ref(10); // 每页显示10条
const logFilters = ref({ provider: "", callType: "", status: "" });
const usageLoading = ref(false);

const modelApplications = ref<any[]>([]);
const showAddAppDialog = ref(false);
const showEditAppDialog = ref(false);
const appSubmitting = ref(false);
const editingAppId = ref("");

interface AppFormData {
  module: string;
  provider: string;
  model: string;
  description: string;
  enabled: boolean;
}

const appFormData = reactive<AppFormData>({
  module: "",
  provider: "",
  model: "",
  description: "",
  enabled: true,
});

const editAppFormData = reactive<AppFormData>({
  module: "",
  provider: "",
  model: "",
  description: "",
  enabled: true,
});

const appFormRules = {
  module: [{ required: true, message: "请选择功能模块", trigger: "change" }],
  provider: [{ required: true, message: "请选择模型厂商", trigger: "change" }],
  model: [{ required: true, message: "请选择模型类型", trigger: "change" }],
};

const allModules = [
  { value: "weekly-report", label: "周报AI分析", icon: "calendar" },
  { value: "monthly-report", label: "月报AI分析", icon: "document" },
  { value: "smart-form", label: "智能配方解析", icon: "form" },
  { value: "smart-import", label: "智能原料导入", icon: "upload" },
  { value: "smart-search", label: "智能数据检索", icon: "search" },
];

const excludeModules = ['smart-form', 'smart-import'];

const availableModules = computed(() => {
  const configuredModuleValues = modelApplications.value.map((app: any) => app.module);
  return allModules.filter(
    (mod) => !configuredModuleValues.includes(mod.value) && !excludeModules.includes(mod.value)
  );
});

const fetchUsageWithMinLoading = async (showLoading = true) => {
  if (showLoading) {
    console.log('[Loading] === 开始显示loading状态 ===');
    usageLoading.value = true;
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[Loading] Loading动画已显示');
  }

  try {
    console.log('[Loading] 开始加载API数据...');
    await modelStore.fetchUsageStats();
    console.log('[Loading] ✅ API数据加载完成');

    // 关键：先关闭loading，让图表容器的DOM元素出现
    if (showLoading) {
      console.log('[Loading] 关闭loading以显示图表容器...');
      usageLoading.value = false;
      await nextTick(); // 等待Vue创建chart-container的DOM
      await new Promise(resolve => setTimeout(resolve, 300)); // 等待浏览器完成DOM渲染
      console.log('[Loading] ✅ 图表容器DOM已准备就绪');
    }

    console.log('[Loading] 开始渲染ECharts图表...');
    renderCharts();
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('[Loading] ✅ ECharts图表渲染完成');

  } catch (error) {
    console.error('[Loading] ❌ 加载过程出错:', error);
    if (showLoading) {
      usageLoading.value = false;
    }
  }
};

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
  { value: "applications", label: "模型应用", iconPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' },
  { value: "float-agent", label: "悬浮助手", iconPath: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>' },
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
  "通义千问": "qwen",
  "通义": "qwen",
  zhipu: "zhipu",
  chatglm: "zhipu",
  glm: "zhipu",
  "智谱": "zhipu",
  "智谱glm": "zhipu",
  "智谱GLM": "zhipu",
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

function getAvailableVersionsForProvider(model: ModelItem) {
  const provider = model.provider?.toLowerCase().trim();
  const versions = PROVIDER_VERSIONS[provider] || PROVIDER_VERSIONS[model.provider] || [];
  if (versions.length > 0) return versions;
  if (model.model) return [{ value: model.model, label: model.model }];
  return [];
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
  addSubmitting.value = true;
  try {
    await modelStore.createModel(addForm.value);
    MessagePlugin.success("模型添加成功");
    showAddDrawer.value = false;
    addForm.value = { provider: "", name: "", baseUrl: "", apiKey: "", model: "", visionModel: "", description: "", supportsVision: false };
  } catch (err: any) {
    MessagePlugin.error(err.message || "添加失败");
  } finally {
    addSubmitting.value = false;
  }
}

async function handleEditModel() {
  editSubmitting.value = true;
  try {
    const data: any = { ...editForm.value };
    if (!data.apiKey) delete data.apiKey;
    await modelStore.updateModel(editingModelId.value, data);
    MessagePlugin.success("模型更新成功");
    showEditDrawer.value = false;
  } catch (err: any) {
    MessagePlugin.error(err.message || "更新失败");
  } finally {
    editSubmitting.value = false;
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
  await modelStore.fetchUsageLogs({ page: current, pageSize: logPageSize.value, ...logFilters.value });
}

// 分页计算
const logTotalPages = computed(() => Math.ceil(modelStore.usageLogsTotal / logPageSize.value) || 1);
const logPageNumbers = computed<(number | string)[]>(() => {
  const total = logTotalPages.value;
  const current = logPage.value;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

async function goLogPage(page: number) {
  if (page < 1 || page > logTotalPages.value || page === logPage.value) return;
  logPage.value = page;
  await modelStore.fetchUsageLogs({ page, pageSize: logPageSize.value, ...logFilters.value });
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
  { colKey: "created_at", title: "时间", width: 160, cell: (_h: any, { row }: any) => formatDateTime(row.created_at) },
];

const logColumns = [
  {
    colKey: "modelName", title: "模型", width: 160, cell: (h: any, { row }: any) => {
      const provider = row.modelName || row.provider || '';
      const logoUrl = getModelLogo(provider);
      return h('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; white-space: nowrap; overflow: hidden; width: 100%;' }, [
        h('div', { style: 'position: relative; width: 20px; height: 20px; min-width: 20px; flex-shrink: 0;' }, [
          h('img', {
            style: 'width: 100%; height: 100%; border-radius: 6px; object-fit: contain; display: block;',
            src: logoUrl,
            alt: provider,
            onError: (e: Event) => {
              const img = e.target as HTMLImageElement;
              if (img) img.style.display = 'none';
              const fallback = img.parentElement?.querySelector('.model-fallback-icon');
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }
          }),
          h('span', {
            style: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; font-weight: 700; display: none; color: ${getFallbackColor(provider)};`
          }, getFallbackLetter(provider))
        ]),
        h('span', { style: 'font-size: 13px; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1;' }, row.modelName)
      ]);
    }
  },
  {
    colKey: "callType", title: "类型", width: 110, cell: (_h: any, { row }: any) => {
      const map: Record<string, string> = {
        parse_formula: "解析配方",
        parse_nutrition: "解析营养",
        natural_search: "自然检索",
        health_check: "健康检测",
        "weekly-report": "周报AI分析",
        "monthly-report": "月报AI分析",
        "smart-search": "智能数据检索",
        dashboard_chat: "AI对话",
        agent_chat: "Agent对话",
        intent_recognition: "意图识别",
        parse_file_image: "图片内容提取",
        nl2sql: "NL2SQL查询",
        unknown: "其他",
      };
      return map[row.callType] || row.callType;
    }
  },
  { colKey: "totalTokens", title: "Token", width: 100, cell: (_h: any, { row }: any) => formatTokens(row.totalTokens) },
  { colKey: "latencyMs", title: "耗时", width: 100, cell: (_h: any, { row }: any) => row.latencyMs ? `${row.latencyMs}ms` : "-" },
  {
    colKey: "status", title: "状态", width: 100, cell: (h: any, { row }: any) => {
      const statusConfig: Record<string, { color: string; label: string; }> = {
        success: { color: '#10b981', label: '成功' },
        error: { color: '#ef4444', label: '失败' },
        fallback: { color: '#f59e0b', label: '切换' }
      };
      const config = statusConfig[row.status] || { color: '#94a3b8', label: row.status || '-' };
      return h('div', { style: 'display: flex; align-items: center; gap: 6px;' }, [
        h('span', {
          style: `width: 8px; height: 8px; border-radius: 50%; background-color: ${config.color}; flex-shrink: 0;`
        }),
        h('span', { style: 'font-size: 13px; font-weight: 500; color: #475569;' }, config.label)
      ]);
    }
  },
  {
    colKey: "requestSummary", title: "摘要", ellipsis: true, cell: (h: any, { row }: any) => {
      const appInfoMap: Record<string, string> = {
        parse_formula: "智能配方解析",
        parse_nutrition: "智能原料导入",
        natural_search: "智能数据检索",
        health_check: "健康检测",
        "weekly-report": "周报AI分析",
        "monthly-report": "月报AI分析",
        "smart-search": "智能数据检索",
        dashboard_chat: "AI对话",
        agent_chat: "Agent对话",
        intent_recognition: "意图识别",
        parse_file_image: "图片内容提取",
        nl2sql: "NL2SQL查询",
        unknown: "其他",
      };

      const appName = appInfoMap[row.callType] || '';
      const summaryText = row.requestSummary || '';

      if (!summaryText && !appName) return '';

      let displayText = summaryText;
      if (appName && displayText.startsWith(appName)) {
        displayText = displayText.slice(appName.length).replace(/^[:：\s]+/, '');
      }

      if (!displayText && appName) {
        return h('div', { style: 'display: flex; flex-direction: column; gap: 2px;' }, [
          h('span', { style: 'font-size: 12px; color: #8B5CF6; font-weight: 600;' }, `[${appName}]`),
        ]);
      }

      try {
        const text = summaryText;
        if (/[\x80-\xFF]/.test(text)) {
          const filePatterns = [
            /(['"])([^'"]+\.(?:xlsx?|csv|txt))\1/i,
            /[:：]\s*([^\s:]+\.(?:xlsx?|csv|txt))/i,
            /(.*[\\\/])?([^\s:]+\.(?:xlsx?|csv|txt))/i
          ];

          for (const pattern of filePatterns) {
            const match = text.match(pattern);
            if (match) {
              const prefix = text.substring(0, text.indexOf(match[0]));
              const filenamePart = match[0];
              if (/[\x80-\xFF]/.test(filenamePart)) {
                const bytes = new Uint8Array([...filenamePart].map(char => char.charCodeAt(0)));
                const decoder = new TextDecoder('utf-8', { fatal: false });
                const decodedFilename = decoder.decode(bytes);
                if (/[\u4e00-\u9fa5a-zA-Z0-9._\-]/.test(decodedFilename) && !/[\x80-\xFF]/.test(decodedFilename)) {
                  return prefix + decodedFilename;
                }
              }
            }
          }

          const bytes = new Uint8Array([...text].map(char => char.charCodeAt(0)));
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const decoded = decoder.decode(bytes);
          if (/[\u4e00-\u9fa5]/.test(decoded) && decoded.length < text.length * 2) {
            displayText = decoded;
          }
        }
      } catch (e) {
        console.warn('Failed to decode requestSummary:', e);
      }

      if (appName) {
        return h('div', { style: 'display: flex; flex-direction: column; gap: 2px;' }, [
          h('span', { style: 'font-size: 12px; color: #8B5CF6; font-weight: 600;' }, `[${appName}]`),
          h('span', { style: 'font-size: 13px; color: #475569;' }, displayText)
        ]);
      }

      return displayText;
    }
  },
  { colKey: "createdAt", title: "时间", width: 160, cell: (_h: any, { row }: any) => formatDateTime(row.createdAt) },
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
      await fetchUsageWithMinLoading(false); // 后台静默刷新，不显示loading
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

const fetchModelApplications = async () => {
  try {
    const token = localStorage.getItem('tingstudio_token') || '';
    const res = await fetch("/api/ai/model-applications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      modelApplications.value = data.data || [];
    }
  } catch (error) {
    console.error("获取模型应用配置失败:", error);
  }
};

const getModuleDisplayName = (module: string): string => {
  const nameMap: Record<string, string> = {
    "weekly-report": "周报AI分析",
    "monthly-report": "月报AI分析",
    "smart-form": "智能配方解析",
    "smart-import": "智能原料导入",
    "smart-search": "智能数据检索",
  };
  return nameMap[module] || module;
};

const getModuleIcon = (module: string): string => {
  const iconMap: Record<string, string> = {
    "weekly-report": '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    "monthly-report": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    "smart-form": '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    "smart-import": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    "smart-search": '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  };
  return iconMap[module] || '<circle cx="12" cy="12" r="10"/>';
};

const getModuleIconBg = (module: string): string => {
  const bgMap: Record<string, string> = {
    "weekly-report": "linear-gradient(135deg, #DBEAFE, #BFDBFE)",
    "monthly-report": "linear-gradient(135deg, #FCE7F3, #FBCFE8)",
    "smart-form": "linear-gradient(135deg, #D1FAE5, #A7F3D0)",
    "smart-import": "linear-gradient(135deg, #FEF3C7, #FDE68A)",
    "smart-search": "linear-gradient(135deg, #EDE9FE, #DDD6FE)",
  };
  return bgMap[module] || "#F1F5F9";
};

const getModelNameByProvider = (provider: string): string => {
  const model = modelStore.models.find((m: any) => m.provider === provider);
  return model?.name || provider;
};

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAvailableVersionsForProviderByString = (provider: string) => {
  if (!provider) return [];
  const model = modelStore.models.find((m: any) => m.provider === provider);
  if (!model) return [];

  const providerKey = provider.toLowerCase().trim();
  const predefinedVersions = PROVIDER_VERSIONS[providerKey] || PROVIDER_VERSIONS[provider] || [];

  if (predefinedVersions.length > 0) {
    return predefinedVersions;
  }

  const versions = [
    { value: model.model, label: `${model.model} (默认)` },
  ];
  if (model.visionModel) {
    versions.push({ value: model.visionModel, label: model.visionModel });
  }
  return versions;
};

const handleAppProviderChange = () => {
  appFormData.model = "";
};

const handleEditAppProviderChange = () => {
  editAppFormData.model = "";
};

const openEditAppDialog = (app: any) => {
  editingAppId.value = app.id;
  editAppFormData.module = app.module;
  editAppFormData.provider = app.provider;
  editAppFormData.model = app.model;
  editAppFormData.description = app.description || "";
  editAppFormData.enabled = app.enabled;
  showEditAppDialog.value = true;
};

const submitAddApp = async () => {
  try {
    appSubmitting.value = true;
    const token = localStorage.getItem('tingstudio_token') || '';
    const res = await fetch("/api/ai/model-applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(appFormData),
    });
    const data = await res.json();
    if (data.success) {
      MessagePlugin.success("添加成功");
      showAddAppDialog.value = false;
      Object.assign(appFormData, { module: "", provider: "", model: "", description: "", enabled: true });
      await fetchModelApplications();
    } else {
      MessagePlugin.error(data.message || "添加失败");
    }
  } catch (error) {
    console.error("添加配置失败:", error);
    MessagePlugin.error("添加失败");
  } finally {
    appSubmitting.value = false;
  }
};

const submitEditApp = async () => {
  try {
    appSubmitting.value = true;
    const token = localStorage.getItem('tingstudio_token') || '';
    const res = await fetch(`/api/ai/model-applications/${editingAppId.value}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editAppFormData),
    });
    const data = await res.json();
    if (data.success) {
      MessagePlugin.success("保存成功");
      showEditAppDialog.value = false;
      await fetchModelApplications();
    } else {
      MessagePlugin.error(data.message || "保存失败");
    }
  } catch (error) {
    console.error("保存配置失败:", error);
    MessagePlugin.error("保存失败");
  } finally {
    appSubmitting.value = false;
  }
};

const toggleAppStatus = async (app: any) => {
  try {
    const newStatus = !app.enabled;
    const token = localStorage.getItem('tingstudio_token') || '';
    const res = await fetch(`/api/ai/model-applications/${app.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      app.enabled = newStatus;
      MessagePlugin.success(newStatus ? "已启用" : "已禁用");
    } else {
      MessagePlugin.error(data.message || "操作失败");
    }
  } catch (error) {
    console.error("切换状态失败:", error);
    MessagePlugin.error("操作失败");
  }
};

const deleteApplication = async (id: string) => {
  try {
    const token = localStorage.getItem('tingstudio_token') || '';
    const res = await fetch(`/api/ai/model-applications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      MessagePlugin.success("删除成功");
      await fetchModelApplications();
    } else {
      MessagePlugin.error(data.message || "删除失败");
    }
  } catch (error) {
    console.error("删除配置失败:", error);
    MessagePlugin.error("删除失败");
  }
};

watch(activeTab, async (tab) => {
  stopUsageRefresh();
  stopModelsRefresh();
  if (tab === "usage") {
    await fetchUsageWithMinLoading();
    startUsageRefresh();
  } else if (tab === "models") {
    await modelStore.fetchModels();
    startModelsRefresh();
  } else if (tab === "applications") {
    await fetchModelApplications();
  } else if (tab === "alerts") {
    await modelStore.fetchAlertConfigs();
    await modelStore.fetchAlertRecords();
  } else if (tab === "logs") {
    logPage.value = 1;
    await modelStore.fetchUsageLogs({ page: 1, pageSize: logPageSize.value });
  } else if (tab === "float-agent") {
    await loadFloatConfig();
  }
});

watch(logFilters, async () => {
  logPage.value = 1;
  await modelStore.fetchUsageLogs({ page: 1, pageSize: logPageSize.value, ...logFilters.value });
}, { deep: true });

onMounted(async () => {
  await modelStore.fetchModels();
  startModelsRefresh();

  if (activeTab.value === 'usage') {
    await fetchUsageWithMinLoading();
    startUsageRefresh();
  }

  await loadFloatConfig();

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

// 调用日志表格分页样式（严格参照销量明细列表）
.log-table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background-color: #fff;
  border-top: 1px solid #f8fafc;
  border-radius: 0 0 32px 32px;

  .pagination-info {
    font-size: 13px;
    color: #64748B;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;

    .pagination-btn {
      min-width: 36px;
      height: 34px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
      background: #fff;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(.pagination-btn--disabled) {
        border-color: #6EE7B7;
        color: #059669;
        background: #ECFDF5;
      }

      &.pagination-btn--active {
        background: linear-gradient(135deg, #10B981, #059669);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }

      &.pagination-btn--disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .pagination-ellipsis {
      padding: 0 6px;
      color: #94A3B8;
      font-size: 14px;
    }
  }
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

@keyframes chart-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

// 调用日志表格样式优化
.model-cell-with-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow: hidden;
  width: 100%;

  .model-logo-wrap-mini {
    position: relative;
    width: 20px;
    height: 20px;
    min-width: 20px;
    flex-shrink: 0;

    .model-logo-img-mini {
      width: 100%;
      height: 100%;
      border-radius: 6px;
      object-fit: contain;
      display: block;
    }

    .model-fallback-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }

  .model-name-text {
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
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

  .chart-loading {
    height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    margin-top: 8px;

    .chart-loading-text {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      font-weight: 500;
    }

    .chart-loading-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top: 3px solid #8B5CF6;
      border-radius: 50%;
      animation: chart-spin 0.8s linear infinite;
    }
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

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .header-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;

    .confirm-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;

      &.create-btn {
        background: var(--gradient-btn, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
        color: #fff;
        box-shadow: 0 2px 8px var(--overlay-brand-25, rgba(0, 0, 0, 0.2));

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px var(--overlay-brand-35, rgba(0, 0, 0, 0.3));
        }
      }

      &.update-btn {
        background: var(--gradient-btn, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
        color: #fff;
        box-shadow: 0 2px 8px var(--overlay-brand-25, rgba(0, 0, 0, 0.2));

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px var(--overlay-brand-35, rgba(0, 0, 0, 0.3));
        }
      }

      &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      &.loading {
        opacity: 0.85;
      }

      svg {
        flex-shrink: 0;
      }
    }
  }
}

.model-drawer {
  :deep(.t-drawer__header) {
    padding: 16px 20px;
    border-bottom: 1px solid #E2E8F0;
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

        .required-mark {
          color: #ef4444;
          margin-left: 2px;
          font-weight: 700;
        }
      }

      .form-row {
        display: flex;
        gap: 16px;

        &.two-col>* {
          flex: 1;
          min-width: 0;
        }
      }

      .select-value-with-logo,
      .option-with-logo {
        display: flex;
        align-items: flex-end;
        gap: 14px;

        .fallback-logo-sm {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          object-fit: contain;
          flex-shrink: 0;
          padding-bottom: 2px;
        }

        span {
          line-height: 1.4;
          font-size: 14px;
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

.applications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.application-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  transition: all $transition-normal;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #cbd5e1;
    transform: translateY(-2px);
  }

  .application-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;

    .app-module-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .app-module-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        flex-shrink: 0;
      }

      .app-module-details {
        .app-module-name {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .app-module-id {
          font-size: 12px;
          color: #94a3b8;
          font-family: "Courier New", monospace;
        }
      }
    }

    .app-status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;

      &.enabled {
        background: #d1fae5;
        color: #059669;
      }

      &.disabled {
        background: #fee2e2;
        color: #dc2626;
      }
    }
  }

  .application-card-body {
    .app-field {
      margin-bottom: 12px;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .field-label {
        font-size: 12px;
        color: #64748b;
        font-weight: 500;
        white-space: nowrap;
        min-width: 70px;
      }

      .field-value {
        font-size: 14px;
        color: #334155;
        font-weight: 500;

        &--desc {
          color: #475569;
          line-height: 1.5;
        }
      }

      .model-provider-display {
        display: flex;
        align-items: center;
        gap: 10px;

        .model-logo-wrap-sm {
          position: relative;
          width: 28px;
          height: 28px;

          .model-logo-sm {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 6px;
            display: block;
          }

          .model-fallback-sm {
            position: absolute;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            background: #f1f5f9;
            border-radius: 6px;
          }

          .model-logo-sm[src=""],
          .model-logo-sm:not([src]) {
            +.model-fallback-sm {
              display: flex;
            }
          }
        }

        .provider-name {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }
      }
    }
  }

  .application-card-footer {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;

    .app-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  }
}

.app-actions-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;

  .add-app-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    background: linear-gradient(135deg, #8B5CF6, #7C3AED);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;

  .empty-icon-wrap {
    margin-bottom: 20px;
    opacity: 0.6;
  }

  .empty-text {
    font-size: 16px;
    font-weight: 600;
    color: #334155;
    margin: 0 0 8px 0;
  }

  .empty-hint {
    font-size: 14px;
    color: #94a3b8;
    margin: 0 0 24px 0;
  }

  .empty-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 22px;
    background: linear-gradient(135deg, #8B5CF6, #7C3AED);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
  }
}

.app-dialog {
  :deep(.t-dialog__body) {
    padding: 24px;
  }

  .app-dialog-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  .app-confirm-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    color: #fff;
    background-color: var(--color-primary, #10B981);
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);

    &:hover:not(:disabled) {
      background-color: var(--color-primary-dark, #059669);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      background-color: var(--color-primary-deep, #047857);
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    svg {
      flex-shrink: 0;
    }
  }

  .dialog-cancel-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #64748b;

    &:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #334155;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }
}

.float-agent-config {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
  padding: 4px 0;

  .fa-card {
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

    .fa-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f8fafc;

      .fa-card-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .fa-card-icon {
        flex-shrink: 0;
      }

      .fa-card-title {
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
      }
    }

    .fa-card-body {
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }

  .fa-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 0;
    gap: 12px;

    &--block {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;

      :deep(.t-checkbox-group) {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 16px;
      }
    }

    .fa-field-label {
      font-size: 13px;
      color: #94a3b8;
      white-space: nowrap;
      flex-shrink: 0;
    }

    :deep(.t-select),
    :deep(.t-input),
    :deep(.t-input-number) {
      width: 180px;
      flex-shrink: 0;
    }
  }

  .fa-toggle-group {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 3px;
    flex-shrink: 0;

    .fa-toggle-btn {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      background: transparent;
      border: none;
      border-radius: 8px;
      padding: 5px 16px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      line-height: 1.4;

      &:hover:not(.active) {
        color: #334155;
        background: rgba(255, 255, 255, 0.7);
      }

      &.active {
        background: #fff;
        color: #10B981;
        box-shadow: 0 1px 4px rgba(16, 185, 129, 0.18);
        font-weight: 600;
      }
    }
  }
}
</style>
