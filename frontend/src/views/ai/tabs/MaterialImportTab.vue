<template>
  <div class="smart-import-tab">
    <section class="ai-panel">
      <div class="ai-panel-bg"></div>
      <div class="ai-panel-content">
        <div class="ai-header">
          <div class="ai-icon">
            <t-icon name="precise-monitor" />
          </div>
          <div class="ai-title-group">
            <h3 class="ai-title">AI 智能原料导入</h3>
            <p class="ai-subtitle">支持识别 Excel 原料营养数据</p>
          </div>
          <div v-if="selectedFile || parsedItems.length || aiStore.materialParseAborted" class="ai-header-status"
            :class="{ 'aborted-status': aiStore.materialParseAborted }">
            <div v-if="aiStore.materialParseLoading" class="status-indicator status-indicator--loading">
              <span class="status-dot status-dot--pulse"></span>
                <span class="status-text">正在解析: {{ selectedFile?.name || '文件' }}</span>
              </div>
            <div v-else-if="aiStore.materialParseAborted" class="status-indicator status-indicator--aborted">
              <span class="status-dot status-dot--aborted"></span>
              <span class="status-text">已终止: {{ selectedFile?.name || '文件' }}</span>
            </div>
            <div v-else-if="parsedItems.length" class="status-indicator status-indicator--done">
              <span class="status-dot status-dot--done"></span>
              <span class="status-text">已解析: {{ selectedFile?.name || '原料数据' }}</span>
            </div>
            <div v-else-if="selectedFile" class="status-indicator status-indicator--ready">
              <span class="status-dot status-dot--ready"></span>
              <span class="status-text">待解析: {{ selectedFile.name }}</span>
            </div>
          </div>
        </div>

        <div class="ai-body">
          <div v-if="!aiStore.materialParseLoading && !parsedItems.length && !aiStore.materialParseAborted"
            class="upload-zone" :class="{ 'drag-over': isDragOver }" @click="triggerFileUpload"
            @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop.prevent="handleDrop">
            <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp"
              style="display: none" @change="handleFileInputChange" />
            <div class="upload-icon">
              <t-icon name="upload" />
            </div>
            <div class="upload-text">
              <p class="upload-title">点击或拖拽文件上传</p>
              <p class="upload-hint">支持 .xlsx, .jpg, .png (最大 10MB)</p>
            </div>
          </div>

          <div v-if="templateList.length > 0 && !aiStore.materialParseLoading && !parsedItems.length" class="template-selector">
            <div class="template-selector-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              解析模板
            </div>
            <t-radio-group
              v-model="selectedTemplateId"
              variant="default-filled"
              size="small"
              @change="handleTemplateChange"
            >
              <t-radio-button
                v-for="t in templateList"
                :key="t.id"
                :value="t.id"
              >{{ t.name }}{{ t.isPreset ? ' (预设)' : '' }}</t-radio-button>
            </t-radio-group>
          </div>

          <div
            v-if="selectedFile && !aiStore.materialParseLoading && !parsedItems.length && !aiStore.materialParseAborted"
            class="file-selected-row">
            <div class="file-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
              <span class="file-format">{{ getFileFormat(selectedFile.name) }}</span>
            </div>
            <div class="file-actions">
              <button class="parse-btn" :disabled="!aiStore.selectedModel || aiStore.materialParseLoading"
                @click="handleParse">
                <svg v-if="!aiStore.materialParseLoading" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                  <path d="M2 17L12 22L22 17" />
                  <path d="M2 12L12 17L22 12" />
                </svg>
                {{ aiStore.materialParseLoading ? '解析中...' : '开始解析' }}
              </button>
              <button class="clear-file-btn clear-file-btn--with-text" @click="clearSelectedFile">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                取消
              </button>
            </div>
          </div>

          <div v-if="aiStore.materialParseLoading" class="parsing-progress">
            <div class="progress-header">
              <span class="progress-status">{{ aiStore.materialParseAborted ? 'AI 解析已终止' : 'AI 正在解析原料营养数据...' }}</span>
              <div class="progress-right">
                <span class="progress-percent">{{ parseProgressText }}</span>
                <span class="progress-timer" :key="parseElapsedTime">{{ parseElapsedTimeFormatted }}</span>
                <button v-if="!aiStore.materialParseAborted" class="abort-btn" @click="handleAbortParse" title="终止解析"
                  aria-label="终止当前解析任务">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  终止
                </button>
              </div>
            </div>
            <div v-if="selectedFile" class="progress-file-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span class="progress-file-name">{{ selectedFile.name }}</span>
              <span class="progress-file-size">{{ formatFileSize(selectedFile.size) }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill progress-fill--indeterminate"></div>
            </div>
            <p class="progress-hint">{{ parseProgressHint }}</p>
            <div v-if="currentModelInfo" class="progress-model-info">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span class="model-name">{{ currentModelInfo.name }}</span>
              <span class="model-version">{{ currentModelInfo.model }}</span>
              <span v-if="currentModelInfo.supportsVision" class="model-feature">支持图片识别</span>
            </div>
          </div>

          <div v-if="aiStore.materialParseError" class="parse-error">
            <div class="parse-error-content">
              <t-icon name="error-circle" />
              <span>{{ aiStore.materialParseError }}</span>
            </div>
            <div class="parse-error-actions">
              <button type="button" class="error-dismiss" @click="aiStore.materialParseError = ''">✕</button>
              <button type="button" class="error-recovery-btn" @click="handleRecoveryParse">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                切换模型重试
              </button>
            </div>
          </div>

          <div v-if="parsedItems.length && !aiStore.materialParseAborted" class="parse-result">
            <div class="result-header">
              <h4 class="result-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                解析结果预览
                <span class="result-count">共 {{ parsedItems.length }} 条</span>
              </h4>
              <div class="result-actions">
                <button type="button" class="header-action-btn header-action-btn--save-template" @click="showSaveTemplateDialog">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  保存为模板
                </button>
                <button type="button" class="header-action-btn header-action-btn--clear" @click="handleClearResult">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  清空
                </button>
                <t-dropdown trigger="hover"
                  :popup-props="{ appendToBody: true, placement: 'bottom-right', overlayClassName: 'reparse-dropdown-popup' }">
                  <button type="button" class="header-action-btn header-action-btn--reparse" @click.stop>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    重新解析
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <t-dropdown-menu>
                    <t-dropdown-item v-for="model in aiStore.models" :key="model.provider" :value="model.provider"
                      @click="(ctx: Record<string, unknown>) => handleReparseWithModel({ value: String(ctx.value ?? '') })">
                      <div class="reparse-model-option">
                        <div class="reparse-model-logo">
                          <img loading="lazy" :src="getModelLogo(model)" :alt="model.name"
                            @error="(e: Event) => handleLogoError(e)" />
                          <span class="reparse-model-fallback" :style="{ color: getFallbackColor(model) }">
                            {{ getFallbackLetter(model) }}
                          </span>
                        </div>
                        <span class="reparse-model-name">{{ model.name }}</span>
                        <svg v-if="aiStore.selectedModel === model.provider" width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                          stroke-linejoin="round" class="reparse-model-check">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </t-dropdown-item>
                  </t-dropdown-menu>
                </t-dropdown>
              </div>
            </div>

            <div class="validation-summary" v-if="validationIssues.length">
              <div class="validation-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                数据校验提示
              </div>
              <div v-for="(issue, idx) in validationIssues" :key="idx" class="validation-item"
                :class="'validation-item--' + issue.type">
                {{ issue.message }}
              </div>
            </div>

            <div class="material-table-wrapper">
              <table class="material-table">
                <thead>
                  <tr>
                    <th class="col-name">名称</th>
                    <th class="col-type">原料类型</th>
                    <th class="col-nutrition">蛋白质</th>
                    <th class="col-nutrition">脂肪</th>
                    <th class="col-nutrition">碳水</th>
                    <th class="col-nutrition">钠</th>
                    <th class="col-price">单价(/kg)</th>
                    <th class="col-adjust">调整</th>
                    <th class="col-status">匹配状态</th>
                    <th class="col-action">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in parsedItems" :key="index"
                    :class="{ 'row-recorded': item.isRecorded, 'row-duplicate': isDuplicateName(item.name, index), 'row-pending': pendingConfirmSet.has(index) }">
                    <td class="cell-name" :class="{ 'cell-missing': !item.name }">
                      <div class="cell-content" v-if="editingCell?.index !== index || editingCell?.field !== 'name'"
                        @click="startEdit(index, 'name')">
                        <span>{{ item.name || '(缺失)' }}</span>
                        <span v-if="item.confidence != null" class="confidence-dot-wrap">
                          <span class="confidence-dot"
                            :style="{ background: getConfidenceColor(item.confidence) }"></span>
                          <span class="confidence-pct" :style="{ color: getConfidenceColor(item.confidence) }">{{
                            Math.round(item.confidence * 100) }}%</span>
                        </span>
                      </div>
                      <input v-else class="cell-edit-input" :class="{ 'cell-missing-input': !item.name }"
                        v-model="item.name" @blur="stopEdit" @keydown.enter="stopEdit" autofocus />
                    </td>
                    <td class="cell-type">
                      <t-tag :theme="item.materialType === 'supplement' ? 'primary' : 'success'" variant="light"
                        size="small">
                        {{ item.materialType === 'supplement' ? '辅料' : '药材' }}
                      </t-tag>
                    </td>
                    <td class="cell-nutrition" :class="{ 'cell-missing': item.protein == null }">
                      <div class="cell-content cell-content--readonly">
                        <span>{{ item.protein != null ? item.protein : '—' }}</span>
                        <t-tag v-if="diffStatusMap[index]?.protein && item.protein != null"
                          :theme="fieldSourceMap[index]?.protein === 'old' ? 'primary' : 'warning'" variant="light"
                          size="small" class="diff-source-tag">
                          {{ fieldSourceMap[index]?.protein === 'old' ? '旧' : '新' }}
                        </t-tag>
                        <span v-if="item.fieldConfidence?.protein != null" class="confidence-dot-wrap">
                          <span class="confidence-dot"
                            :style="{ background: getConfidenceColor(item.fieldConfidence.protein!) }"></span>
                          <span class="confidence-pct"
                            :style="{ color: getConfidenceColor(item.fieldConfidence.protein!) }">{{
                              Math.round(item.fieldConfidence.protein! * 100) }}%</span>
                        </span>
                      </div>
                    </td>
                    <td class="cell-nutrition" :class="{ 'cell-missing': item.fat == null }">
                      <div class="cell-content cell-content--readonly">
                        <span>{{ item.fat != null ? item.fat : '—' }}</span>
                        <t-tag v-if="diffStatusMap[index]?.fat && item.fat != null"
                          :theme="fieldSourceMap[index]?.fat === 'old' ? 'primary' : 'warning'" variant="light"
                          size="small" class="diff-source-tag">
                          {{ fieldSourceMap[index]?.fat === 'old' ? '旧' : '新' }}
                        </t-tag>
                        <span v-if="item.fieldConfidence?.fat != null" class="confidence-dot-wrap">
                          <span class="confidence-dot"
                            :style="{ background: getConfidenceColor(item.fieldConfidence.fat!) }"></span>
                          <span class="confidence-pct"
                            :style="{ color: getConfidenceColor(item.fieldConfidence.fat!) }">{{
                              Math.round(item.fieldConfidence.fat! * 100) }}%</span>
                        </span>
                      </div>
                    </td>
                    <td class="cell-nutrition" :class="{ 'cell-missing': item.carbohydrate == null }">
                      <div class="cell-content cell-content--readonly">
                        <span>{{ item.carbohydrate != null ? item.carbohydrate : '—' }}</span>
                        <t-tag v-if="diffStatusMap[index]?.carbohydrate && item.carbohydrate != null"
                          :theme="fieldSourceMap[index]?.carbohydrate === 'old' ? 'primary' : 'warning'" variant="light"
                          size="small" class="diff-source-tag">
                          {{ fieldSourceMap[index]?.carbohydrate === 'old' ? '旧' : '新' }}
                        </t-tag>
                        <span v-if="item.fieldConfidence?.carbohydrate != null" class="confidence-dot-wrap">
                          <span class="confidence-dot"
                            :style="{ background: getConfidenceColor(item.fieldConfidence.carbohydrate!) }"></span>
                          <span class="confidence-pct"
                            :style="{ color: getConfidenceColor(item.fieldConfidence.carbohydrate!) }">{{
                              Math.round(item.fieldConfidence.carbohydrate! * 100) }}%</span>
                        </span>
                      </div>
                    </td>
                    <td class="cell-nutrition" :class="{ 'cell-missing': item.sodium == null }">
                      <div class="cell-content cell-content--readonly">
                        <span>{{ item.sodium != null ? item.sodium : '—' }}</span>
                        <t-tag v-if="diffStatusMap[index]?.sodium && item.sodium != null"
                          :theme="fieldSourceMap[index]?.sodium === 'old' ? 'primary' : 'warning'" variant="light"
                          size="small" class="diff-source-tag">
                          {{ fieldSourceMap[index]?.sodium === 'old' ? '旧' : '新' }}
                        </t-tag>
                        <span v-if="item.fieldConfidence?.sodium != null" class="confidence-dot-wrap">
                          <span class="confidence-dot"
                            :style="{ background: getConfidenceColor(item.fieldConfidence.sodium!) }"></span>
                          <span class="confidence-pct"
                            :style="{ color: getConfidenceColor(item.fieldConfidence.sodium!) }">{{
                              Math.round(item.fieldConfidence.sodium! * 100) }}%</span>
                        </span>
                      </div>
                    </td>
                    <td class="cell-price" :class="{ 'cell-missing': item.unitPrice == null }">
                      <div class="cell-price-edit" v-if="item.unitPrice != null">
                        <t-input-number :model-value="item.unitPrice ?? 0"
                          @change="(val: number) => handlePriceAdjust(index, val)" :min="0" :precision="2" size="small"
                          theme="normal" style="width: 90px" />
                      </div>
                      <div class="cell-content" v-else @click="startEdit(index, 'unitPrice')">
                        <span>—</span>
                      </div>
                    </td>
                    <td class="cell-adjust">
                      <span v-if="priceAdjustments[index]?.isAdjusted" class="col-adjust-badge"
                        :title="'原价: ¥' + (priceAdjustments[index]?.originalPrice ?? '--') + '/kg'">
                        <svg viewBox="0 0 12 12" width="10" height="10">
                          <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="var(--color-warning)" />
                        </svg>
                        价
                      </span>
                      <button v-if="priceAdjustments[index]?.isAdjusted" type="button" class="col-restore-btn"
                        @click="handleRestorePrice(index)"
                        :title="'恢复原价: ¥' + (priceAdjustments[index]?.originalPrice ?? '--') + '/kg'">
                        <t-icon name="rollback" size="12px" />
                      </button>
                    </td>
                    <td class="cell-status">
                      <t-tag v-if="pendingConfirmSet.has(parsedItems.indexOf(item))" theme="warning" variant="light"
                        size="small">
                        <template #icon><t-icon name="error-circle" /></template>
                        待定
                      </t-tag>
                      <t-tag v-else-if="confirmedSet.has(parsedItems.indexOf(item))" theme="primary" variant="light"
                        size="small">
                        <template #icon><t-icon name="swap" /></template>
                        已变更
                      </t-tag>
                      <t-tag v-else-if="item.isRecorded" theme="success" variant="light" size="small">已存在</t-tag>
                      <t-tag v-else-if="isDuplicateName(item.name, parsedItems.indexOf(item))" theme="danger"
                        variant="light" size="small">重复</t-tag>
                      <t-tag v-else theme="default" variant="light" size="small">新增</t-tag>
                    </td>
                    <td class="cell-action">
                      <div class="action-btns">
                        <button
                          v-if="item.isRecorded && diffStatusMap[index] && Object.values(diffStatusMap[index]).some(Boolean)"
                          class="tbl-action-btn tbl-action-btn--diff" @click="openDiff(index)" title="查看差异">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8z" />
                            <polyline points="14 3 14 8 21 8" />
                          </svg>
                        </button>
                        <button class="tbl-action-btn tbl-action-btn--remove" @click="removeItem(index)" title="移除">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="batch-actions">
              <div v-if="pendingItems.length > 0" class="batch-pending-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{{ pendingItems.length }} 条原料存在数据差异，需先确认后方可录入</span>
              </div>
              <div class="batch-btn-group">
                <button class="batch-btn batch-btn--all" :disabled="batchSubmitting || validItems.length === 0"
                  @click="handleBatchSubmit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  一键录入 ({{ validItems.length }})
                </button>
                <button class="batch-btn batch-btn--sequential"
                  :disabled="batchSubmitting || validItems.length === 0 || sequentialActive"
                  @click="startSequentialImport">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  逐条录入 ({{ validItems.length }})
                </button>
              </div>
            </div>

            <div v-if="sequentialActive && sequentialCurrentItem" class="sequential-confirm-card">
              <div class="sequential-confirm-header">
                <div class="sequential-confirm-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-lavender)" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  逐条录入确认
                </div>
                <div class="sequential-progress-badge">
                  {{ sequentialCurrentIdx + 1 }} / {{ sequentialResults.length }}
                </div>
              </div>
              <div class="sequential-progress-bar">
                <div class="sequential-progress-fill"
                  :style="{ width: ((sequentialCurrentIdx + 1) / sequentialResults.length * 100) + '%' }"></div>
              </div>
              <div class="sequential-item-detail">
                <div class="sequential-item-name">{{ sequentialCurrentItem.name }}</div>
                <div class="sequential-item-meta">
                  <t-tag :theme="sequentialCurrentItem.materialType === 'supplement' ? 'primary' : 'success'"
                    variant="light" size="small">
                    {{ sequentialCurrentItem.materialType === 'supplement' ? '辅料' : '药材' }}
                  </t-tag>
                  <span v-if="sequentialCurrentItem.unitPrice != null" class="sequential-item-price">
                    ¥{{ sequentialCurrentItem.unitPrice.toFixed(2) }}/kg
                  </span>
                </div>
                <div class="sequential-item-nutrition" v-if="hasNutritionData(sequentialCurrentItem)">
                  <span v-if="sequentialCurrentItem.protein != null">蛋白质: {{ sequentialCurrentItem.protein }}</span>
                  <span v-if="sequentialCurrentItem.fat != null">脂肪: {{ sequentialCurrentItem.fat }}</span>
                  <span v-if="sequentialCurrentItem.carbohydrate != null">碳水: {{ sequentialCurrentItem.carbohydrate
                    }}</span>
                  <span v-if="sequentialCurrentItem.sodium != null">钠: {{ sequentialCurrentItem.sodium }}</span>
                </div>
              </div>
              <div class="sequential-confirm-actions">
                <button class="sequential-btn sequential-btn--confirm" @click="confirmSequentialItem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  确认录入
                </button>
                <button class="sequential-btn sequential-btn--skip" @click="skipSequentialItem">
                  跳过
                </button>
                <button class="sequential-btn sequential-btn--stop" @click="stopSequentialImport">
                  终止录入
                </button>
              </div>
            </div>

            <div v-if="batchSubmitting" class="progress-section">
              <div class="progress-header">
                <span class="progress-label">录入进度</span>
                <span class="progress-count">{{ batchProgress.current }} / {{ batchProgress.total }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: batchProgressPercent + '%' }"></div>
              </div>
              <div v-if="batchProgress.currentItem" class="progress-current">
                正在处理: {{ batchProgress.currentItem }}
              </div>
            </div>

            <div v-if="batchSummary" class="summary-card">
              <div class="summary-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                录入完成
              </div>
              <div class="summary-body">
                <div class="summary-item summary-item--success">
                  <span class="summary-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span class="summary-label">成功</span>
                  <span class="summary-value">{{ batchSummary.success }}</span>
                </div>
                <div class="summary-item summary-item--fail">
                  <span class="summary-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </span>
                  <span class="summary-label">失败</span>
                  <span class="summary-value">{{ batchSummary.failed }}</span>
                </div>
                <div v-if="batchSummary.errors.length" class="summary-errors">
                  <div v-for="(err, idx) in batchSummary.errors" :key="idx" class="summary-error-item">
                    {{ err }}
                  </div>
                </div>
              </div>
              <div v-if="fileUploadStatus" class="summary-file-status"
                :class="{ 'summary-file-status--success': fileUploadStatus.uploaded, 'summary-file-status--fail': !fileUploadStatus.uploaded }">
                <svg v-if="fileUploadStatus.uploaded" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span class="summary-file-name">{{ fileUploadStatus.fileName }}</span>
                <span class="summary-file-size">{{ formatFileSize(fileUploadStatus.fileSize) }}</span>
                <span class="summary-file-result">{{ fileUploadStatus.uploaded ? '已上传' : '上传失败' }}</span>
              </div>
              <div v-if="canUndoImport" class="summary-undo">
                <button type="button" class="undo-btn" :disabled="undoLoading" @click="handleUndoImport">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  {{ undoLoading ? '撤销中...' : '撤销上次导入（5分钟内）' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <t-dialog v-model:visible="saveTemplateDialogVisible" :attach="'body'" width="480px"
      :confirm-btn="{ content: '保存', theme: 'primary', loading: saveTemplateLoading }"
      :cancel-btn="{ content: '取消' }" @confirm="handleSaveTemplate">
      <template #header>
        <div class="save-template-dialog-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          保存为解析模板
        </div>
      </template>
      <div class="save-template-form">
        <div class="form-field">
          <label class="form-label">模板名称 <span class="required">*</span></label>
          <t-input v-model="saveTemplateForm.name" placeholder="如：营养数据模板" :maxlength="30" />
        </div>
        <div class="form-field">
          <label class="form-label">分类</label>
          <t-select v-model="saveTemplateForm.category"
            :options="[
              { label: '营养数据', value: 'nutrition' },
              { label: '配方文件', value: 'formula' },
              { label: '通用', value: 'general' },
            ]" />
        </div>
        <div class="form-field">
          <label class="form-label">默认模型</label>
          <t-select v-model="saveTemplateForm.defaultProvider"
            :options="aiStore.models.map((m: AIModel) => ({ label: m.name, value: m.provider }))"
            clearable placeholder="跟随全局设置" />
        </div>
        <div class="form-field">
          <label class="form-label">自定义提示词</label>
          <t-textarea v-model="saveTemplateForm.customPrompt"
            placeholder="如：此文件中文表头，A列为原料名称，B列为类型..."
            :maxlength="500" :autosize="{ minRows: 2, maxRows: 4 }" />
        </div>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="diffDialogVisible" :footer="false" width="760px" :attach="'body'">
      <template #header>
        <div class="diff-dialog-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-lavender)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8z" />
            <polyline points="14 3 14 8 21 8" />
            <line x1="15" y1="13" x2="9" y2="13" />
            <line x1="15" y1="17" x2="9" y2="17" />
          </svg>
          <span>营养数据对比</span>
          <t-tag v-if="confirmedSet.has(diffIndex)" theme="primary" variant="light" size="small"
            style="margin-left: auto;">
            已变更
          </t-tag>
        </div>
      </template>
      <div v-if="diffData" class="diff-content">
        <div class="diff-material-name">{{ diffData.name }}</div>
        <table class="diff-table">
          <thead>
            <tr>
              <th>字段</th>
              <th>现有数据</th>
              <th>新数据</th>
              <th style="width: 220px;">选择保留</th>
              <th style="width: 100px;">预览值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in diffFields" :key="field.key"
              :class="{ 'diff-row-changed': field.changed, 'diff-row-preview': field.changed && diffChoices[diffIndex]?.[field.key] === 'old' }">
              <td class="diff-field-label">{{ field.label }}</td>
              <td class="diff-old">{{ field.oldVal != null ? field.oldVal : '—' }}</td>
              <td class="diff-new" :class="{ 'diff-highlight': field.changed }">{{ field.newVal != null ? field.newVal :
                '—' }}</td>
              <td class="diff-action">
                <div v-if="field.changed" class="diff-choice" :key="`choice-${diffIndex}-${field.key}-${resetVersion}`">
                  <t-radio-group :value="diffChoices[diffIndex]?.[field.key] === 'old' ? 'old' : 'new'"
                    @change="(val: string) => handleDiffChoice(field.key, val as 'new' | 'old')" size="small"
                    variant="default-filled" :style="{ '--td-radio-bg-color': primaryColor }">
                    <t-radio-button value="new">新</t-radio-button>
                    <t-radio-button value="old">旧</t-radio-button>
                  </t-radio-group>
                </div>
                <span v-else class="diff-same">一致</span>
              </td>
              <td class="diff-preview-value"
                :class="{ 'preview-old': field.changed && diffChoices[diffIndex]?.[field.key] === 'old' }">
                {{ getPreviewValue(field) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="diff-summary" v-if="hasAnyChange">
          <div class="diff-summary-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-lavender)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div class="diff-summary-text">
            <span class="summary-label">应用后将更新：</span>
            <span v-for="f in changedFieldsList" :key="f.key" class="summary-item"
              :class="{ 'item-keep': diffChoices[diffIndex]?.[f.key] === 'old' }">
              {{ f.label }}={{ getPreviewValue(f) }}
              <small>({{ diffChoices[diffIndex]?.[f.key] === 'old' ? '保留旧值' : '使用新值' }})</small>
            </span>
          </div>
        </div>
        <div class="diff-footer">
          <button class="diff-cancel-btn" @click="cancelDiff">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            取消
          </button>
          <button class="diff-reset-btn" @click="resetDiffChoices">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            重置
          </button>
          <button class="diff-apply-btn" @click="applyDiff">应用选择</button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAiStore } from '@/stores/ai';
import { useMaterialStore } from '@/stores/material';
import { useThemeStore } from '@/stores/theme';
import { getThemeTokens } from '@/assets/styles/tokens';
import { materialApi } from '@/api/material';
import { nutritionApi } from '@/api/nutrition';
import { fileApi } from '@/api/file';
import { parseTemplateApi, type ParseTemplate } from '@/api/parseTemplate';
import { MessagePlugin } from 'tdesign-vue-next';
import type { MaterialNutritionItem } from '@/api/ai';
import type { AIModel } from '@/api/ai';

interface ModelLike {
  provider: string;
  name: string;
}

const emit = defineEmits<{
  (e: 'activity-add', item: { type: string; title: string; desc: string; time: string; }): void;
}>();

const aiStore = useAiStore();
const materialStore = useMaterialStore();
const themeStore = useThemeStore();
const route = useRoute();

const themeTokens = computed(() => getThemeTokens(themeStore.isDark, themeStore.brandColor));
const primaryColor = computed(() => themeTokens.value.primary);

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const parsedItems = ref<MaterialNutritionItem[]>([]);
const editingCell = ref<{ index: number; field: string; } | null>(null);
const parseStartTime = ref(Date.now());
const parseElapsedTime = ref(0);
let parseTimer: ReturnType<typeof setInterval> | null = null;
const isDragOver = ref(false);

const batchSubmitting = ref(false);
const batchProgress = reactive({
  current: 0,
  total: 0,
  currentItem: '',
});
const batchSummary = ref<{ success: number; failed: number; errors: string[]; } | null>(null);

interface ImportRecord {
  materialId: string;
  isNewMaterial: boolean;
  oldNutritionData?: Record<string, number>;
  oldDataSource?: string;
  oldConfidence?: string;
}
const importSessionRecords = ref<ImportRecord[]>([]);
const canUndoImport = ref(false);
const undoLoading = ref(false);
const IMPORT_UNDO_KEY = 'smart_import_undo_session';
const IMPORT_UNDO_TTL = 5 * 60 * 1000;

const templateList = ref<ParseTemplate[]>([]);
const selectedTemplateId = ref<string | undefined>(undefined);
const saveTemplateDialogVisible = ref(false);
const saveTemplateLoading = ref(false);
const saveTemplateForm = reactive({
  name: '',
  category: 'nutrition' as 'formula' | 'nutrition' | 'general',
  defaultProvider: undefined as string | undefined,
  customPrompt: '',
});

const fetchTemplates = async () => {
  try {
    const res = await parseTemplateApi.getList({ category: 'nutrition', pageSize: 100 });
    templateList.value = res.list || [];
  } catch {
    // ignore template fetch failure
  }
};

const handleTemplateChange = (value: string | undefined) => {
  if (!value) return;
  const template = templateList.value.find(t => t.id === value);
  if (!template) return;
  if (template.defaultProvider) {
    aiStore.selectedModel = template.defaultProvider;
    aiStore.loadModelVersions(template.defaultProvider);
  }
  selectedTemplateId.value = value;
};

const showSaveTemplateDialog = () => {
  saveTemplateForm.name = '';
  saveTemplateForm.category = 'nutrition';
  saveTemplateForm.defaultProvider = aiStore.selectedModel || undefined;
  saveTemplateForm.customPrompt = '';
  saveTemplateDialogVisible.value = true;
};

const handleSaveTemplate = async () => {
  if (!saveTemplateForm.name.trim()) {
    MessagePlugin.warning('请输入模板名称');
    return;
  }
  saveTemplateLoading.value = true;
  try {
    await parseTemplateApi.create({
      name: saveTemplateForm.name.trim(),
      category: saveTemplateForm.category,
      defaultProvider: saveTemplateForm.defaultProvider || null,
      defaultModel: null,
      customPrompt: saveTemplateForm.customPrompt || null,
    });
    MessagePlugin.success('模板保存成功');
    saveTemplateDialogVisible.value = false;
    await fetchTemplates();
  } catch (err: unknown) {
    const e = err as { message?: string };
    MessagePlugin.error(e?.message || '保存模板失败');
  } finally {
    saveTemplateLoading.value = false;
  }
};

const saveUndoSession = () => {
  if (importSessionRecords.value.length === 0) return;
  const session = {
    records: importSessionRecords.value,
    timestamp: Date.now(),
  };
  localStorage.setItem(IMPORT_UNDO_KEY, JSON.stringify(session));
  canUndoImport.value = true;
};

const checkUndoSession = () => {
  try {
    const raw = localStorage.getItem(IMPORT_UNDO_KEY);
    if (!raw) { canUndoImport.value = false; return; }
    const session = JSON.parse(raw);
    if (Date.now() - session.timestamp > IMPORT_UNDO_TTL) {
      localStorage.removeItem(IMPORT_UNDO_KEY);
      canUndoImport.value = false;
      return;
    }
    canUndoImport.value = session.records && session.records.length > 0;
  } catch {
    canUndoImport.value = false;
  }
};

const handleUndoImport = async () => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(IMPORT_UNDO_KEY);
  } catch { return; }
  if (!raw) { MessagePlugin.warning('无可撤销的导入记录'); return; }
  const session = JSON.parse(raw);
  if (Date.now() - session.timestamp > IMPORT_UNDO_TTL) {
    localStorage.removeItem(IMPORT_UNDO_KEY);
    canUndoImport.value = false;
    MessagePlugin.warning('撤销时限已过（5分钟），无法撤销');
    return;
  }

  undoLoading.value = true;
  let undone = 0;
  let failed = 0;
  try {
    for (const record of [...session.records].reverse()) {
      try {
        if (record.isNewMaterial) {
          await materialApi.delete(record.materialId);
        } else if (record.oldNutritionData && Object.keys(record.oldNutritionData).length > 0) {
          await nutritionApi.setMaterialNutrition(record.materialId, {
            per100g: record.oldNutritionData,
            dataSource: record.oldDataSource || '手动录入',
            confidence: record.oldConfidence || 'medium',
          });
        }
        undone++;
      } catch {
        failed++;
      }
    }
    localStorage.removeItem(IMPORT_UNDO_KEY);
    canUndoImport.value = false;
    importSessionRecords.value = [];
    await materialStore.fetchMaterials();
    batchSummary.value = null;
    if (failed === 0) {
      MessagePlugin.success(`撤销成功：已回退 ${undone} 条记录`);
    } else {
      MessagePlugin.warning(`撤销完成：成功 ${undone} 条，失败 ${failed} 条`);
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    MessagePlugin.error('撤销失败：' + (e?.message || '未知错误'));
  } finally {
    undoLoading.value = false;
  }
};

const priceAdjustments = ref<Record<number, { originalPrice: number; isAdjusted: boolean; }>>({});

const sequentialActive = ref(false);
const sequentialCurrentIdx = ref(0);
const sequentialCurrentItem = ref<MaterialNutritionItem | null>(null);
const sequentialResults = ref<{ item: MaterialNutritionItem; status: 'pending' | 'confirmed' | 'skipped'; }[]>([]);

const diffDialogVisible = ref(false);
const diffData = ref<MaterialNutritionItem | null>(null);
const diffIndex = ref(-1);
const diffExistingNutrition = ref<Record<string, number>>({});
const originalAiDataMap = ref<Record<number, Record<string, unknown>>>({});
const currentDisplayData = ref<Record<string, unknown> | null>(null);
const diffChoices = reactive<Record<number, Record<string, 'new' | 'old'>>>({});
const resetVersion = ref(0);

const diffStatusMap = ref<Record<number, Record<string, boolean>>>({});

const fieldSourceMap = ref<Record<number, Record<string, 'new' | 'old'>>>({});

const pendingConfirmSet = ref<Set<number>>(new Set());

const confirmedSet = ref<Set<number>>(new Set());

const fileUploadStatus = ref<{ uploaded: boolean; fileName: string; fileSize: number; fileId?: string; error?: string; } | null>(null);

const triggerFileUpload = () => {
  fileInputRef.value?.click();
};

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const handleFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    processFile(input.files[0]);
  }
};

const processFile = (file: File) => {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    MessagePlugin.warning('文件大小不能超过 10MB');
    return;
  }
  selectedFile.value = file;
};

const clearSelectedFile = () => {
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
};

const getFileFormat = (name: string): string => {
  const ext = name.split('.').pop()?.toUpperCase() || '';
  return ext;
};

const handleParse = async () => {
  if (!selectedFile.value) {
    MessagePlugin.warning('请先选择要解析的文件');
    return;
  }
  if (!aiStore.selectedModel) {
    MessagePlugin.warning('请先选择 AI 模型');
    return;
  }
  batchSummary.value = null;
  parseStartTime.value = Date.now();
  await aiStore.parseMaterial(selectedFile.value);
  if (aiStore.materialParseResult) {
    parsedItems.value = aiStore.materialParseResult.materials.map(m => ({ ...m }));
    await materialStore.fetchAllForSelect();
    matchExistingMaterials();
  }
};

const handleReparseWithModel = async (data: { value: string; }) => {
  aiStore.selectedModel = data.value;
  await aiStore.loadModelVersions(data.value);
  aiStore.clearMaterialParseResult();
  parsedItems.value = [];
  batchSummary.value = null;
  if (selectedFile.value) {
    handleParse();
  }
};

const handleRecoveryParse = async () => {
  aiStore.materialParseError = '';
  aiStore.clearMaterialParseResult();
  parsedItems.value = [];
  batchSummary.value = null;
  if (!selectedFile.value) return;

  const currentModelIdx = aiStore.models.findIndex(m => m.provider === aiStore.selectedModel);
  const nextModel = aiStore.models[(currentModelIdx + 1) % aiStore.models.length];
  if (nextModel && nextModel.provider !== aiStore.selectedModel) {
    aiStore.selectedModel = nextModel.provider;
    await aiStore.loadModelVersions(nextModel.provider);
  }

  parseStartTime.value = Date.now();
  try {
    await aiStore.parseMaterial(selectedFile.value);
    if (aiStore.materialParseResult) {
      parsedItems.value = aiStore.materialParseResult.materials.map(m => ({ ...m }));
      await materialStore.fetchAllForSelect();
      matchExistingMaterials();
    }
  } catch {
    // 错误由 aiStore 处理
  }
};

const MODEL_LOGO_MAP: Record<string, string> = {
  openai: 'openai', gpt: 'openai', chatgpt: 'openai',
  anthropic: 'claude', claude: 'claude',
  google: 'google', gemini: 'google',
  deepseek: 'deepseek',
  qwen: 'qwen', tongyi: 'qwen', '通义千问': 'qwen',
  zhipu: 'zhipu', chatglm: 'zhipu', '智谱': 'zhipu', glm: 'zhipu',
  baidu: 'baidu', wenxin: 'baidu', '文心': 'baidu',
  doubao: 'bytedance', '豆包': 'bytedance', bytedance: 'bytedance',
  moonshot: 'moonshot', kimi: 'moonshot', '月之暗面': 'moonshot',
  minimax: 'minimax',
  hunyuan: 'tencent', '腾讯': 'tencent',
};

const FALLBACK_ICONS: Record<string, { letter: string; color: string; }> = {
  openai: { letter: 'O', color: '#10a37f' },
  claude: { letter: 'C', color: '#d97757' },
  google: { letter: 'G', color: '#4285f4' },
  deepseek: { letter: 'D', color: '#4b6bfb' },
  qwen: { letter: 'Q', color: 'var(--color-lavender)' },
  zhipu: { letter: 'Z', color: '#4268fa' },
  baidu: { letter: 'B', color: '#2932e1' },
  bytedance: { letter: 'D', color: '#25f4ee' },
  moonshot: { letter: 'M', color: '#000' },
  minimax: { letter: 'M', color: '#615ced' },
  tencent: { letter: 'T', color: '#0052d9' },
};

const getModelSlug = (model: ModelLike): string => {
  const provider = (model.provider || '').toLowerCase();
  const name = (model.name || '').toLowerCase();
  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (provider.includes(key) || name.includes(key)) {
      return slug.startsWith('http') ? key : slug;
    }
  }
  return 'openai';
};

const getModelLogo = (model: ModelLike): string => {
  const slug = getModelSlug(model);
  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
};

const getFallbackLetter = (model: ModelLike): string => {
  const slug = getModelSlug(model);
  return FALLBACK_ICONS[slug]?.letter || '?';
};

const getFallbackColor = (model: ModelLike): string => {
  const slug = getModelSlug(model);
  return FALLBACK_ICONS[slug]?.color || 'var(--color-text-placeholder)';
};

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const wrap = img.parentElement;
  if (wrap) {
    const fallback = wrap.querySelector('.reparse-model-fallback');
    if (fallback) (fallback as HTMLElement).style.display = 'flex';
  }
};

const handleClearResult = () => {
  aiStore.clearMaterialParseResult();
  parsedItems.value = [];
  batchSummary.value = null;
  priceAdjustments.value = {};
  sequentialActive.value = false;
  sequentialCurrentItem.value = null;
  sequentialResults.value = [];
  fileUploadStatus.value = null;
  diffStatusMap.value = {};
  fieldSourceMap.value = {};
  pendingConfirmSet.value.clear();
  confirmedSet.value.clear();
};

const matchExistingMaterials = async () => {
  const existing = materialStore.allMaterials;
  pendingConfirmSet.value.clear();
  for (let i = 0; i < parsedItems.value.length; i++) {
    const item = parsedItems.value[i];
    if (!item.name) continue;
    const found = existing.find(m => m.name === item.name);
    if (found) {
      item.isRecorded = true;
      item.materialId = found.id;
      try {
        const existingNutrition = await nutritionApi.getMaterialNutrition(found.id, true);
        if (existingNutrition?.per100g) {
          const fields = ['protein', 'fat', 'carbohydrate', 'sodium'] as const;
          const fieldDiffs: Record<string, boolean> = {};
          let hasAnyDiff = false;
          for (const f of fields) {
            const oldVal = existingNutrition.per100g[f];
            const newVal = (item as Record<string, unknown>)[f];
            fieldDiffs[f] = oldVal !== newVal && !(oldVal == null && newVal == null);
            if (fieldDiffs[f]) hasAnyDiff = true;
          }
          diffStatusMap.value[i] = fieldDiffs;
          if (hasAnyDiff) {
            pendingConfirmSet.value.add(i);
          }
        } else {
          diffStatusMap.value[i] = { protein: true, fat: true, carbohydrate: true, sodium: true };
          pendingConfirmSet.value.add(i);
        }
      } catch {
        diffStatusMap.value[i] = { protein: true, fat: true, carbohydrate: true, sodium: true };
        pendingConfirmSet.value.add(i);
      }
    }
  }
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'var(--color-primary)';
  if (confidence >= 0.5) return 'var(--color-warning)';
  return 'var(--color-danger)';
};

const isDuplicateName = (name: string, currentIndex: number): boolean => {
  if (!name) return false;
  return parsedItems.value.some((item, idx) => idx !== currentIndex && item.name === name);
};

const startEdit = (index: number, field: string) => {
  editingCell.value = { index, field };
};

const stopEdit = () => {
  editingCell.value = null;
};

const removeItem = (index: number) => {
  parsedItems.value.splice(index, 1);
};

const handlePriceAdjust = (index: number, val: number) => {
  const item = parsedItems.value[index];
  if (!item) return;
  if (!priceAdjustments.value[index]) {
    priceAdjustments.value[index] = {
      originalPrice: item.unitPrice ?? 0,
      isAdjusted: false,
    };
  }
  item.unitPrice = val;
  priceAdjustments.value[index].isAdjusted = val !== priceAdjustments.value[index].originalPrice;
};

const handleRestorePrice = (index: number) => {
  const adj = priceAdjustments.value[index];
  if (!adj) return;
  parsedItems.value[index].unitPrice = adj.originalPrice;
  adj.isAdjusted = false;
};

const hasNutritionData = (item: MaterialNutritionItem): boolean => {
  return item.protein != null || item.fat != null || item.carbohydrate != null || item.sodium != null;
};

const validationIssues = computed(() => {
  const issues: { type: 'error' | 'warning'; message: string; }[] = [];
  const names = parsedItems.value.map(i => i.name).filter(Boolean);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length) {
    issues.push({ type: 'error', message: `检测到重复名称: ${uniqueDuplicates.join('、')}` });
  }

  for (const item of parsedItems.value) {
    if (!item.name) {
      issues.push({ type: 'error', message: '存在名称为空的记录，请补充后提交' });
      break;
    }
  }

  for (const item of parsedItems.value) {
    if (item.protein != null && item.protein < 0) {
      issues.push({ type: 'warning', message: `${item.name} 的蛋白质值为负数` });
    }
    if (item.fat != null && item.fat < 0) {
      issues.push({ type: 'warning', message: `${item.name} 的脂肪值为负数` });
    }
    if (item.carbohydrate != null && item.carbohydrate < 0) {
      issues.push({ type: 'warning', message: `${item.name} 的碳水值为负数` });
    }
    if (item.sodium != null && item.sodium < 0) {
      issues.push({ type: 'warning', message: `${item.name} 的钠值为负数` });
    }
  }

  const missingRecommended = parsedItems.value.filter(
    i => i.name && (i.protein == null || i.fat == null || i.carbohydrate == null || i.sodium == null)
  );
  if (missingRecommended.length) {
    issues.push({
      type: 'warning',
      message: `${missingRecommended.length} 条记录缺少推荐字段（蛋白质/脂肪/碳水/钠）`,
    });
  }

  return issues;
});

const validItems = computed(() => {
  return parsedItems.value.filter((item, idx) =>
    item.name && !isDuplicateName(item.name, idx) && !pendingConfirmSet.value.has(idx)
  );
});

const pendingItems = computed(() => {
  return parsedItems.value.filter((item, idx) =>
    item.name && !isDuplicateName(item.name, idx) && pendingConfirmSet.value.has(idx)
  );
});

const batchProgressPercent = computed(() => {
  if (batchProgress.total === 0) return 0;
  return Math.round((batchProgress.current / batchProgress.total) * 100);
});

const currentModelInfo = computed(() => {
  if (!aiStore.selectedModel) return null;
  return aiStore.models.find(m => m.provider === aiStore.selectedModel) || null;
});

const parseElapsedTimeFormatted = computed(() => {
  if (!aiStore.materialParseLoading) return '0s';
  const seconds = Math.floor(parseElapsedTime.value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
});

const startParseTimer = () => {
  parseElapsedTime.value = 0;
  if (parseTimer) clearInterval(parseTimer);
  parseTimer = setInterval(() => {
    parseElapsedTime.value += 1000;
  }, 1000);
};

const stopParseTimer = () => {
  if (parseTimer) {
    clearInterval(parseTimer);
    parseTimer = null;
  }
};

const handleAbortParse = () => {
  if (!aiStore.materialParseLoading || aiStore.materialParseAborted) return;

  aiStore.abortParseMaterial();
  stopParseTimer();

  parsedItems.value = [];
  originalAiDataMap.value = {};
  Object.keys(diffChoices).forEach(k => delete diffChoices[Number(k)]);
  diffStatusMap.value = {};
  fieldSourceMap.value = {};
  priceAdjustments.value = {};

  MessagePlugin.warning({
    content: 'AI 解析已终止',
    duration: 3000,
  });
};

watch(() => aiStore.materialParseLoading, (loading) => {
  if (loading) {
    startParseTimer();
  } else {
    stopParseTimer();
  }
});

onUnmounted(() => {
  stopParseTimer();
});

const parseProgressText = computed(() => {
  if (!aiStore.materialParseLoading) return '';
  const elapsed = Date.now() - parseStartTime.value;
  const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
  const modelLabel = currentModel ? currentModel.name : aiStore.selectedModel;
  if (elapsed < 2000) return `连接 ${modelLabel} 服务...`;
  if (elapsed < 5000) return `上传文件至 ${modelLabel}...`;
  if (elapsed < 10000) return `${modelLabel} 分析中...`;
  if (elapsed < 20000) return `${modelLabel} 提取营养数据...`;
  return `${modelLabel} 即将完成...`;
});

const parseProgressHint = computed(() => {
  const hints = [
    '正在识别文档结构与内容',
    '提取原料名称与营养数据',
    '匹配系统原料数据库',
    '校验数据合理性与单位',
    '生成结构化营养数据'
  ];
  if (!aiStore.materialParseLoading) return '';
  const stage = Math.floor((Date.now() - parseStartTime.value) / 4000) % hints.length;
  const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
  const modelInfo = currentModel ? ` · ${currentModel.name}${currentModel.supportsVision ? ' (支持图片)' : ''}` : '';
  return hints[stage] + '...' + modelInfo;
});

const handleBatchSubmit = async () => {
  if (validItems.value.length === 0) {
    MessagePlugin.warning('没有可录入的有效数据');
    return;
  }
  batchSubmitting.value = true;
  batchSummary.value = null;
  batchProgress.current = 0;
  batchProgress.total = validItems.value.length;
  batchProgress.currentItem = '';

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    for (const item of validItems.value) {
      batchProgress.currentItem = item.name;
      try {
        await submitSingleItem(item);
        success++;
      } catch (err: unknown) {
        failed++;
        errors.push(`${item.name}: ${err instanceof Error ? err.message : '录入失败'}`);
      }
      batchProgress.current++;
    }
  } finally {
    batchSubmitting.value = false;
    batchSummary.value = { success, failed, errors };
    saveUndoSession();
    emit('activity-add', {
      type: success > 0 ? 'success' : 'warning',
      title: '批量导入完成',
      desc: `成功 ${success} 条，失败 ${failed} 条`,
      time: new Date().toLocaleString('zh-CN'),
    });
    MessagePlugin.success(`录入完成：成功 ${success}，失败 ${failed}`);
    await materialStore.fetchMaterials();

    if (selectedFile.value && success > 0) {
      try {
        const fd = new FormData();
        fd.append('file', selectedFile.value);
        fd.append('fileType', 'material');
        const uploaded = await fileApi.upload(fd);
        fileUploadStatus.value = {
          uploaded: true,
          fileName: selectedFile.value.name,
          fileSize: selectedFile.value.size,
          fileId: uploaded.fileId,
        };
        MessagePlugin.success(`源文件「${selectedFile.value.name}」已上传`);
      } catch (fileErr: unknown) {
        const e = fileErr as { message?: string };
        fileUploadStatus.value = {
          uploaded: false,
          fileName: selectedFile.value.name,
          fileSize: selectedFile.value.size,
          error: e?.message || '上传失败',
        };
        MessagePlugin.warning('原料数据已录入，但源文件上传失败');
      }
    }
  }
};

const startSequentialImport = () => {
  if (validItems.value.length === 0) {
    MessagePlugin.warning('没有可录入的有效数据');
    return;
  }
  sequentialActive.value = true;
  sequentialCurrentIdx.value = 0;
  sequentialResults.value = validItems.value.map(item => ({ item, status: 'pending' as const }));
  sequentialCurrentItem.value = sequentialResults.value[0]?.item ?? null;
};

const confirmSequentialItem = async () => {
  if (!sequentialCurrentItem.value) return;
  const result = sequentialResults.value[sequentialCurrentIdx.value];
  if (result) {
    result.status = 'confirmed';
    try {
      await submitSingleItem(result.item);
      MessagePlugin.success(`${result.item.name} 录入成功`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      MessagePlugin.error(`${result.item.name} 录入失败: ${e?.message || '未知错误'}`);
    }
  }
  advanceSequential();
};

const skipSequentialItem = () => {
  const result = sequentialResults.value[sequentialCurrentIdx.value];
  if (result) {
    result.status = 'skipped';
  }
  advanceSequential();
};

const advanceSequential = () => {
  sequentialCurrentIdx.value++;
  if (sequentialCurrentIdx.value >= sequentialResults.value.length) {
    finishSequentialImport();
  } else {
    sequentialCurrentItem.value = sequentialResults.value[sequentialCurrentIdx.value]?.item ?? null;
  }
};

const stopSequentialImport = () => {
  finishSequentialImport();
};

const finishSequentialImport = async () => {
  sequentialActive.value = false;
  sequentialCurrentItem.value = null;
  const confirmed = sequentialResults.value.filter(r => r.status === 'confirmed');
  const skipped = sequentialResults.value.filter(r => r.status === 'skipped');
  const pending = sequentialResults.value.filter(r => r.status === 'pending');
  const failedCount = pending.length;
  batchSummary.value = {
    success: confirmed.length,
    failed: failedCount,
    errors: skipped.map(r => `${r.item.name}: 已跳过`),
  };
  saveUndoSession();
  emit('activity-add', {
    type: confirmed.length > 0 ? 'success' : 'warning',
    title: '逐条导入完成',
    desc: `成功 ${confirmed.length} 条，跳过 ${skipped.length} 条`,
    time: new Date().toLocaleString('zh-CN'),
  });
  MessagePlugin.success(`逐条录入完成：成功 ${confirmed.length}，跳过 ${skipped.length}`);
  await materialStore.fetchMaterials();
};

const submitSingleItem = async (item: MaterialNutritionItem) => {
  let materialId = item.materialId;
  const isNewMaterial = !item.isRecorded || !materialId;
  let oldNutritionData: Record<string, number> | undefined;
  let oldDataSource: string | null | undefined;
  let oldConfidence: string | null | undefined;

  if (isNewMaterial) {
    const codeRes = await materialApi.getNextCode(item.name);
    const code = codeRes.code;
    const created = await materialApi.create({
      name: item.name,
      code,
      unit: 'kg',
      materialType: item.materialType || 'herb',
      unitPrice: item.unitPrice ?? undefined,
    });
    materialId = created.id;
  } else if (materialId) {
    try {
      const existing = await nutritionApi.getMaterialNutrition(materialId, true);
      if (existing?.per100g) {
        oldNutritionData = { ...existing.per100g };
        oldDataSource = existing.dataSource;
        oldConfidence = existing.confidence;
      }
    } catch {
      // ignore existing nutrition parse failure
    }
  }

  const per100g: Record<string, number> = {};
  if (item.protein != null) per100g.protein = item.protein;
  if (item.fat != null) per100g.fat = item.fat;
  if (item.carbohydrate != null) per100g.carbohydrate = item.carbohydrate;
  if (item.sodium != null) per100g.sodium = item.sodium;

  if (Object.keys(per100g).length > 0) {
    await nutritionApi.setMaterialNutrition(materialId!, {
      per100g,
      dataSource: item.dataSource || 'AI智能导入',
      confidence: (item.confidence ?? 0) >= 0.8 ? 'high' : (item.confidence ?? 0) >= 0.5 ? 'medium' : 'low',
    });
  }

  importSessionRecords.value.push({
    materialId: materialId!,
    isNewMaterial,
    oldNutritionData,
    oldDataSource: oldDataSource ?? undefined,
    oldConfidence: oldConfidence ?? undefined,
  });
};

const openDiff = async (index: number) => {
  const item = parsedItems.value[index];
  if (!item.materialId) return;

  diffIndex.value = index;
  diffData.value = item;

  try {
    const existing = await nutritionApi.getMaterialNutrition(item.materialId, true);
    diffExistingNutrition.value = existing?.per100g || {};
  } catch {
    diffExistingNutrition.value = {};
  }

  if (originalAiDataMap.value[index]) {
    currentDisplayData.value = { ...originalAiDataMap.value[index] };
  } else {
    const fields = ['protein', 'fat', 'carbohydrate', 'sodium'] as const;
    const aiDataCopy: Record<string, unknown> = {};
    for (const f of fields) {
      aiDataCopy[f] = (item as Record<string, unknown>)[f];
    }
    currentDisplayData.value = aiDataCopy;
  }

  const fields = ['protein', 'fat', 'carbohydrate', 'sodium'] as const;
  if (!diffChoices[diffIndex.value]) {
    diffChoices[diffIndex.value] = {};
  }
  for (const f of fields) {
    if (!(f in diffChoices[diffIndex.value])) {
      diffChoices[diffIndex.value][f] = 'new';
    }
  }

  diffDialogVisible.value = true;
};

const handleDiffChoice = (fieldKey: string, choice: 'new' | 'old') => {
  if (!diffChoices[diffIndex.value]) return;
  if (diffChoices[diffIndex.value][fieldKey] === choice) return;
  diffChoices[diffIndex.value][fieldKey] = choice;

  if (currentDisplayData.value && diffExistingNutrition.value) {
    if (choice === 'old') {
      currentDisplayData.value[fieldKey] = diffExistingNutrition.value[fieldKey] ?? null;
    } else {
      currentDisplayData.value[fieldKey] = originalAiDataMap.value[diffIndex.value]?.[fieldKey] ?? null;
    }
  }
};

const getPreviewValue = (field: { key: string; oldVal: unknown; newVal: unknown; changed: boolean }): string => {
  if (!field.changed) return field.newVal != null ? String(field.newVal) : '—';
  const currentChoices = diffChoices[diffIndex.value];
  if (!currentChoices) return field.newVal != null ? String(field.newVal) : '—';
  return currentChoices[field.key] === 'old'
    ? (field.oldVal != null ? String(field.oldVal) : '—')
    : (currentDisplayData.value?.[field.key] != null ? String(currentDisplayData.value[field.key]) : '—');
};

const hasAnyChange = computed(() => {
  if (!diffData.value || diffIndex.value < 0) return false;
  const diffs = diffStatusMap.value[diffIndex.value];
  return diffs ? Object.values(diffs).some(Boolean) : false;
});

const changedFieldsList = computed(() => {
  return diffFields.value.filter(f => f.changed);
});

const diffFields = computed(() => {
  if (!currentDisplayData.value) return [];
  const fields = [
    { key: 'protein', label: '蛋白质' },
    { key: 'fat', label: '脂肪' },
    { key: 'carbohydrate', label: '碳水' },
    { key: 'sodium', label: '钠' },
  ];
  return fields.map(f => {
    const oldVal = (diffExistingNutrition.value as Record<string, unknown>)[f.key] ?? null;
    const newVal = (currentDisplayData.value as Record<string, unknown>)[f.key] ?? null;
    const changed = oldVal !== newVal && !(oldVal == null && newVal == null);
    return { ...f, oldVal, newVal, changed };
  });
});

const applyDiff = () => {
  if (!diffData.value || diffIndex.value < 0) return;
  const item = parsedItems.value[diffIndex.value];
  const fields = ['protein', 'fat', 'carbohydrate', 'sodium'] as const;
  if (!fieldSourceMap.value[diffIndex.value]) {
    fieldSourceMap.value[diffIndex.value] = {};
  }
  const currentChoices = diffChoices[diffIndex.value];
  for (const f of fields) {
    if (currentChoices?.[f] === 'old') {
      (item as Record<string, unknown>)[f] = (diffExistingNutrition.value as Record<string, unknown>)[f] ?? null;
      fieldSourceMap.value[diffIndex.value][f] = 'old';
    } else {
      fieldSourceMap.value[diffIndex.value][f] = 'new';
    }
  }
  pendingConfirmSet.value.delete(diffIndex.value);
  confirmedSet.value.add(diffIndex.value);
  diffDialogVisible.value = false;
  MessagePlugin.success('已应用选择，原料状态已更新为「已变更」');
};

const cancelDiff = () => {
  diffDialogVisible.value = false;
  currentDisplayData.value = null;
};

const resetDiffChoices = async () => {
  if (diffIndex.value < 0 || !originalAiDataMap.value[diffIndex.value]) return;

  const fields = ['protein', 'fat', 'carbohydrate', 'sodium'] as const;

  currentDisplayData.value = { ...originalAiDataMap.value[diffIndex.value] };

  const newChoices: Record<string, 'new' | 'old'> = {};
  for (const f of fields) {
    newChoices[f] = 'new';
  }

  diffChoices[diffIndex.value] = newChoices;
  resetVersion.value++;

  await nextTick();

  MessagePlugin.success('已重置为最新AI解析数据');
};

const resetAllData = () => {
  selectedFile.value = null;
  parsedItems.value = [];
  editingCell.value = null;
  batchSummary.value = null;
  priceAdjustments.value = {};
  sequentialActive.value = false;
  sequentialCurrentItem.value = null;
  sequentialResults.value = [];
  diffDialogVisible.value = false;
  diffData.value = null;
  diffIndex.value = -1;
  diffExistingNutrition.value = {};
  Object.keys(diffChoices).forEach(k => delete diffChoices[Number(k)]);
  fileUploadStatus.value = null;
  aiStore.clearMaterialParseResult();
  pendingConfirmSet.value.clear();
  confirmedSet.value.clear();
  diffStatusMap.value = {};
  fieldSourceMap.value = {};
  if (fileInputRef.value) fileInputRef.value.value = '';
};

watch(() => route.path, (newPath, oldPath) => {
  if (oldPath && !oldPath.startsWith('/ai-assistant') && newPath.startsWith('/ai-assistant')) {
    resetAllData();
  }
});

onMounted(() => {
  aiStore.clearMaterialParseResult();
  parsedItems.value = [];
  selectedFile.value = null;
  batchSummary.value = null;
  priceAdjustments.value = {};
  fileUploadStatus.value = null;
  diffStatusMap.value = {};
  fieldSourceMap.value = {};
  checkUndoSession();
  fetchTemplates();
});

watch(() => aiStore.materialParseResult, (newVal) => {
  if (newVal && !aiStore.materialParseAborted) {
    parsedItems.value = newVal.materials.map(m => ({ ...m }));

    const fields = ['protein', 'fat', 'carbohydrate', 'sodium'] as const;
    const newMap: Record<number, Record<string, unknown>> = {};
    newVal.materials.forEach((m, idx) => {
      const itemData: Record<string, unknown> = {};
      for (const f of fields) {
        itemData[f] = (m as Record<string, unknown>)[f];
      }
      newMap[idx] = itemData;
    });
    originalAiDataMap.value = newMap;

    materialStore.fetchAllForSelect().then(() => matchExistingMaterials());
  }
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss' as *;

.smart-import-tab {
  animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.ai-panel {
  background: linear-gradient(145deg, var(--color-bg-container) 0%, var(--color-bg-page) 50%, var(--color-border-light) 100%);
  padding: 32px;
  border-radius: 2.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px $overlay-emerald-06;
  color: var(--color-text-primary);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s ease both;
  animation-delay: 0.1s;
  border: 1px solid rgba(148, 163, 184, 0.15);

  .ai-panel-bg {
    position: absolute;
    top: -40px;
    right: -40px;
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, $overlay-emerald-12 0%, transparent 70%);
    filter: blur(60px);
    border-radius: 50%;
  }

  .ai-panel-content {
    position: relative;
    z-index: 1;
  }

  .ai-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;

    .ai-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, $emerald-500, $emerald-teal);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .t-icon {
        font-size: 24px;
        color: var(--color-text-white);
      }
    }

    .ai-title-group {
      .ai-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }

      .ai-subtitle {
        font-size: 12px;
        color: var(--color-text-placeholder);
        margin: 4px 0 0;
      }
    }

    .ai-header-status {
      margin-left: auto;
      flex-shrink: 0;

      &.aborted-status {
        padding-top: 8px;
        margin-bottom: 16px;
      }

      .status-indicator {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: var(--space-1-25) 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      .status-indicator--loading {
        background: rgba(59, 130, 246, 0.08);
        color: var(--color-info);
        border: 1px solid rgba(59, 130, 246, 0.15);
      }

      .status-indicator--done {
        background: rgba(16, 185, 129, 0.08);
        color: var(--color-primary-dark);
        border: 1px solid rgba(16, 185, 129, 0.15);
      }

      .status-indicator--ready {
        background: rgba(245, 158, 11, 0.08);
        color: var(--color-warning);
        border: 1px solid rgba(245, 158, 11, 0.15);
      }

      .status-indicator--aborted {
        background: rgba(239, 68, 68, 0.08);
        color: var(--color-danger);
        border: 1px solid rgba(239, 68, 68, 0.15);
        margin-top: 24px;
        padding: var(--space-2-5) var(--space-3-5);
        transition: all 0.3s ease;
        animation: aborted-fade-in 0.3s ease-out;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        transition: background 0.3s ease;
      }

      .status-dot--pulse {
        background: var(--color-info);
        animation: dot-pulse 1.4s ease-in-out infinite;
      }

      .status-dot--done {
        background: var(--color-primary);
      }

      .status-dot--ready {
        background: var(--color-warning);
        animation: dot-blink 2s ease-in-out infinite;
      }

      .status-dot--aborted {
        background: var(--color-danger);
      }

      .status-text {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @keyframes dot-pulse {

        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }

        50% {
          opacity: 0.4;
          transform: scale(0.7);
        }
      }

      @keyframes aborted-fade-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes dot-blink {

        0%,
        100% {
          opacity: 1;
        }

        50% {
          opacity: 0.3;
        }
      }
    }
  }

  .ai-body {
    .upload-zone {
      border: 2px dashed rgba(148, 163, 184, 0.25);
      border-radius: var(--radius-4xl);
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover,
      &.drag-over {
        border-color: $overlay-emerald-50;
        background: $overlay-emerald-04;
      }

      .upload-icon {
        width: 64px;
        height: 64px;
        background: $overlay-emerald-08;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: $emerald-500;
        transition: transform 0.2s ease;
      }

      &:hover .upload-icon {
        transform: scale(1.1);
      }

      .upload-text {
        text-align: center;

        .upload-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
        }

        .upload-hint {
          font-size: 10px;
          color: var(--color-text-secondary);
          margin: 4px 0 0;
        }
      }
    }

    .template-selector {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
      margin-top: 12px;
      padding: var(--space-2-5) 16px;
      background: var(--color-bg-container);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);

      .template-selector-label {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        font-size: 13px;
        font-weight: 600;
        color: var(--color-primary);
        white-space: nowrap;
        flex-shrink: 0;
      }
    }

    .file-selected-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding: var(--space-3-5) var(--space-4-5);
      background: var(--color-bg-container);
      border: 1px solid var(--color-border);
      border-radius: 12px;

      .file-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--color-text-primary);
        font-weight: 500;

        .file-name {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          color: var(--color-text-placeholder);
          font-size: 12px;
          font-weight: 400;
        }

        .file-format {
          padding: 1px var(--space-1-5);
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-primary-dark);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
        }
      }

      .file-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .parse-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: 8px var(--space-4-5);
      border-radius: 10px;
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      color: var(--color-text-white);
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all $transition-normal;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px $overlay-emerald-35;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .clear-file-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: var(--color-bg-container);
      color: var(--color-text-placeholder);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background: var(--color-danger-bg);
        color: var(--color-danger);
      }

      &--with-text {
        width: auto;
        height: auto;
        padding: 8px var(--space-4-5);
        gap: var(--space-1-5);
        font-size: 13px;
        font-weight: 700;
        border-radius: 10px;
        border: 1px solid var(--color-border);
        background: var(--color-bg-container);
        color: var(--color-text-placeholder);

        &:hover {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-color: var(--color-danger-border);
        }
      }
    }

    .parsing-progress {
      padding: 24px;
      background: $overlay-emerald-04;
      border-radius: var(--radius-4xl);
      border: 1px solid rgba(148, 163, 184, 0.18);

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .progress-status {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }

        .progress-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-percent {
          font-size: 12px;
          font-family: monospace;
          color: $emerald-500;
        }

        .progress-timer {
          display: inline-flex;
          align-items: center;
          padding: var(--space-0-5) var(--space-2-5);
          background: var(--color-primary);
          color: var(--color-text-white);
          font-size: 11px;
          font-weight: 700;
          font-family: 'SF Mono', 'Fira Code', monospace;
          border-radius: 20px;
          box-shadow: 0 2px 8px $overlay-emerald-25;
          animation: timerPulse 1s ease-in-out infinite;

          @keyframes timerPulse {

            0%,
            100% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.05);
            }
          }
        }

        .abort-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1-25);
          padding: var(--space-1-25) var(--space-3-5);
          background: linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger) 100%);
          color: var(--color-text-white);
          font-size: 12px;
          font-weight: 600;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
          margin-left: var(--space-2-5);

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
            background: linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger) 100%);
          }

          &:active {
            transform: translateY(0) scale(0.98);
          }

          svg {
            transition: transform 0.3s ease;
          }

          &:hover svg {
            transform: rotate(90deg);
          }
        }
      }

      .progress-file-info {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: 8px 12px;
        background: rgba(16, 185, 129, 0.06);
        border-radius: 8px;
        margin-bottom: 12px;

        .progress-file-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .progress-file-size {
          font-size: 11px;
          color: var(--color-text-placeholder);
          flex-shrink: 0;
        }
      }

      .progress-bar {
        height: 6px;
        background: rgba(148, 163, 184, 0.20);
        border-radius: var(--radius-xs);
        overflow: hidden;
        margin-bottom: 12px;

        .progress-fill {
          height: 100%;
          background: $gradient-emerald-light;
          background-size: 200% 100%;
          border-radius: var(--radius-xs);

          &--indeterminate {
            width: 40% !important;
            animation: progressSlide 1.5s ease-in-out infinite;
          }
        }
      }

      .progress-hint {
        font-size: 10px;
        color: var(--color-text-secondary);
        font-style: italic;
        margin: 0;
      }

      .progress-model-info {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        margin-top: var(--space-2-5);
        padding: var(--space-1-5) var(--space-2-5);
        background: var(--color-bg-container);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-secondary);
        font-size: 11px;

        svg {
          flex-shrink: 0;
          opacity: 0.7;
        }

        .model-name {
          font-weight: 700;
        }

        .model-version {
          color: var(--color-text-placeholder);
          font-family: monospace;
          font-size: 10px;
        }

        .model-feature {
          padding: 1px var(--space-1-5);
          background: rgba(99, 102, 241, 0.1);
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
      }
    }

    .parse-error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 16px;
      padding: var(--space-3-5) var(--space-4-5);
      background: $color-danger-bg;
      border: 1px solid $color-danger-medium;
      border-radius: 16px;
      color: var(--color-danger);
      font-size: 12px;
      font-weight: 600;

      .parse-error-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;

        .t-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .parse-error-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .error-dismiss {
        background: none;
        border: none;
        color: var(--color-danger);
        cursor: pointer;
        font-size: 14px;
        opacity: 0.5;
        padding: var(--space-0-5) 4px;
        transition: opacity 0.2s;

        &:hover {
          opacity: 1;
        }
      }

      .error-recovery-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: var(--space-1-25) 12px;
        background: linear-gradient(135deg, var(--color-warning), var(--color-warning));
        color: var(--color-text-white);
        border: none;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(245, 158, 11, 0.35);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    .parse-result {
      animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;

      .result-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 12px;

        .result-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;

          .result-count {
            font-size: 12px;
            font-weight: 500;
            color: var(--color-text-placeholder);
            background: var(--color-border-light);
            padding: var(--space-0-5) 8px;
            border-radius: 6px;
          }
        }

        .result-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2-5);

          .header-action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-1-25);
            padding: var(--space-2) var(--space-3-5);
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all $transition-fast;
            white-space: nowrap;
            line-height: 1;

            svg {
              flex-shrink: 0;
            }

            &--clear {
              background: var(--color-danger-bg);
              border: 1px solid var(--color-danger-border);
              color: var(--color-danger);

              svg {
                color: var(--color-danger);
              }

              &:hover {
                background: var(--color-danger-bg);
                border-color: var(--color-danger-border);
                color: var(--color-danger);

                svg {
                  color: var(--color-danger);
                }
              }

              &:active {
                background: var(--color-danger-border);
                transform: scale(0.97);
              }
            }

            &--save-template {
              background: var(--color-primary-bg);
              border: 1px solid var(--color-primary);
              color: var(--color-primary);

              svg {
                color: var(--color-primary);
              }

              &:hover {
                background: var(--color-primary);
                border-color: var(--color-primary);
                color: var(--color-text-white);

                svg {
                  color: var(--color-text-white);
                }
              }

              &:active {
                background: var(--color-primary-dark);
                transform: scale(0.97);
              }
            }

            &--reparse {
              background: var(--color-bg-container);
              border: 1px solid var(--color-border);
              color: var(--color-text-secondary);

              svg {
                color: var(--color-text-secondary);
              }

              &:hover {
                background: var(--color-primary-bg);
                border-color: var(--color-primary);
                color: var(--color-primary);

                svg {
                  color: var(--color-primary);
                }
              }

              &:active {
                background: var(--color-primary-bg);
                transform: scale(0.97);
              }
            }
          }
        }
      }
    }

    .validation-summary {
      background: var(--color-warning-bg);
      border: 1px solid var(--color-warning);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;

      .validation-title {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        font-size: 14px;
        font-weight: 600;
        color: var(--color-warning-dark);
        margin-bottom: var(--space-2-5);
      }

      .validation-item {
        font-size: 13px;
        padding: 4px 0 4px 20px;
        line-height: 1.5;

        &--error {
          color: var(--color-danger);
        }

        &--warning {
          color: var(--color-warning);
        }
      }
    }

    .material-table-wrapper {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid var(--color-border-light);
    }

    .material-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;

      th {
        background: var(--color-bg-page);
        padding: 12px var(--space-3-5);
        text-align: left;
        font-weight: 600;
        color: var(--color-text-secondary);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--color-border);
        white-space: nowrap;
      }

      td {
        padding: var(--space-2-5) var(--space-3-5);
        border-bottom: 1px solid var(--color-border-light);
        color: var(--color-text-primary);
        vertical-align: middle;
      }

      tr {
        transition: background $transition-fast;

        &:hover {
          background: var(--color-bg-page);
        }

        &.row-recorded {
          background: rgba(16, 185, 129, 0.03);
        }

        &.row-duplicate {
          background: rgba(239, 68, 68, 0.04);
        }

        &.row-pending {
          background: rgba(245, 158, 11, 0.05);
          border-left: 3px solid var(--color-warning);
        }
      }

      .col-name {
        min-width: 140px;
      }

      .col-type {
        min-width: 70px;
      }

      .col-nutrition {
        min-width: 110px;
      }

      .col-price {
        min-width: 90px;
        text-align: right;
      }

      .col-adjust {
        min-width: 80px;
        text-align: center;
      }

      .col-status {
        min-width: 80px;
      }

      .col-action {
        min-width: 70px;
      }
    }

    .cell-content {
      display: flex;
      align-items: center;
      gap: var(--space-1-5);
      cursor: pointer;
      padding: var(--space-0-5) 4px;
      border-radius: 4px;
      transition: background $transition-fast;

      &:hover {
        background: var(--color-border-light);
      }

      &--readonly {
        cursor: default;

        &:hover {
          background: transparent;
        }
      }
    }

    .diff-source-tag {
      margin-left: 4px;
      font-size: 10px !important;
      line-height: 1;
      padding: 0 4px !important;
    }

    .cell-type {
      text-align: center;
    }

    .cell-price {
      text-align: right;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .cell-price-edit {
      display: flex;
      align-items: center;
      justify-content: flex-end;

      :deep(.t-input-number .t-input__inner) {
        text-align: right;
        font-size: 12px;
        font-weight: 600;
      }
    }

    .cell-adjust {
      text-align: center;

      .col-adjust-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-0-5);
        font-size: 10px;
        line-height: 1.4;
        padding: var(--space-0-5) var(--space-1-5);
        border-radius: 6px;
        background: linear-gradient(135deg, var(--color-warning-bg), var(--color-warning));
        color: var(--color-warning-dark);
        font-weight: 700;
        flex-shrink: 0;
        cursor: help;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
          background: linear-gradient(135deg, var(--color-warning), var(--color-warning));
          transform: scale(1.05);
        }
      }

      .col-restore-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        background: var(--color-bg-container);
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        padding: 0;
        vertical-align: middle;

        &:hover {
          background: var(--color-border-light);
          border-color: var(--color-text-placeholder);
          color: var(--color-primary-dark);
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }

    .cell-missing {
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 4px;
    }

    .cell-missing-input {
      border-color: var(--color-danger) !important;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
    }

    .cell-edit-input {
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--color-primary);
      border-radius: 4px;
      font-size: 13px;
      outline: none;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);

      &[type='number'] {
        width: 80px;
      }
    }

    .confidence-dot-wrap {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .confidence-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .confidence-pct {
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .action-btns {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .tbl-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all $transition-fast;
      background: transparent;

      &--diff {
        color: var(--color-info);

        &:hover {
          background: var(--color-info-bg);
        }
      }

      &--remove {
        color: var(--color-text-placeholder);

        &:hover {
          background: var(--color-danger-bg);
          color: var(--color-danger);
        }
      }
    }

    .batch-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2-5);
      margin-top: 24px;
    }

    .batch-pending-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: var(--space-2-5) var(--space-3-5);
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.2);
      font-size: 13px;
      color: var(--color-warning-dark);

      svg {
        flex-shrink: 0;
      }
    }

    .batch-btn-group {
      display: flex;
      gap: 12px;
    }

    .batch-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: var(--space-2-5) var(--space-6);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all $transition-normal;

      &--all {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: var(--color-text-white);

        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px $overlay-emerald-35;
        }
      }

      &--sequential {
        background: var(--color-bg-container);
        color: var(--color-primary);
        border: 1px solid var(--color-primary);

        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px $overlay-emerald-25;
        }
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .progress-section {
      margin-top: 24px;
      padding: 20px;
      background: var(--color-bg-page);
      border-radius: 12px;
      border: 1px solid var(--color-border-light);

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-2-5);

        .progress-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .progress-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-primary);
        }
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--color-border);
        border-radius: 4px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
          border-radius: 4px;
          transition: width 0.3s ease;
        }
      }

      .progress-current {
        margin-top: 8px;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
    }

    .sequential-confirm-card {
      margin-top: 20px;
      padding: 20px;
      background: var(--color-bg-container);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      animation: fadeInUp 0.3s ease both;

      .sequential-confirm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        .sequential-confirm-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .sequential-progress-badge {
          padding: var(--space-1) var(--space-2-5);
          background: var(--color-primary-bg);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          color: var(--color-primary);
          font-variant-numeric: tabular-nums;
        }
      }

      .sequential-progress-bar {
        width: 100%;
        height: 6px;
        background: var(--color-border-light);
        border-radius: var(--radius-xs);
        overflow: hidden;
        margin-bottom: 16px;

        .sequential-progress-fill {
          height: 100%;
          background: var(--color-primary);
          border-radius: var(--radius-xs);
          transition: width 0.3s ease;
        }
      }

      .sequential-item-detail {
        padding: var(--space-3-5) 16px;
        background: var(--color-bg-container);
        border-radius: 12px;
        border: 1px solid var(--color-border);
        margin-bottom: 16px;

        .sequential-item-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        }

        .sequential-item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;

          .sequential-item-price {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-primary-dark);
          }
        }

        .sequential-item-nutrition {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;

          span {
            padding: var(--space-0-5) 8px;
            background: var(--color-border-light);
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text-secondary);
          }
        }
      }

      .sequential-confirm-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sequential-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        border: none;
        cursor: pointer;
        transition: all $transition-fast;

        &--confirm {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: var(--color-text-white);

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px $overlay-emerald-25;
          }
        }

        &--skip {
          background: var(--color-bg-container);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);

          &:hover {
            background: var(--color-bg-page);
            border-color: var(--color-text-placeholder);
          }
        }

        &--stop {
          background: transparent;
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.2);

          &:hover {
            background: var(--color-danger-bg);
            border-color: var(--color-danger-border);
          }
        }
      }
    }

    .summary-card {
      margin-top: 24px;
      background: var(--color-bg-container);
      border-radius: 16px;
      border: 1px solid var(--color-border-light);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      overflow: hidden;

      .summary-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 20px;
        background: var(--color-primary-bg);
        font-size: 15px;
        font-weight: 700;
        color: var(--color-primary);
      }

      .summary-body {
        padding: 20px;
        display: flex;
        gap: 32px;
        flex-wrap: wrap;
      }

      .summary-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .summary-icon {
          display: flex;
          align-items: center;
        }

        .summary-label {
          font-size: 14px;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 800;
        }

        &--success .summary-value {
          color: var(--color-primary);
        }

        &--fail .summary-value {
          color: var(--color-danger);
        }
      }

      .summary-errors {
        width: 100%;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border-light);

        .summary-error-item {
          font-size: 12px;
          color: var(--color-danger);
          padding: 4px 0;
          line-height: 1.5;
        }
      }
    }

    .summary-file-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-top: 1px solid var(--color-border-light);
      font-size: 12px;

      &--success {
        color: var(--color-primary-dark);
        background: var(--color-primary-bg);
      }

      &--fail {
        color: var(--color-danger);
        background: var(--color-danger-bg);
      }

      .summary-file-name {
        font-weight: 600;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .summary-file-size {
        color: var(--color-text-placeholder);
      }

      .summary-file-result {
        margin-left: auto;
        font-weight: 700;
      }
    }

    .summary-undo {
      padding: 12px 20px;
      border-top: 1px solid var(--color-border-light);
      display: flex;
      justify-content: flex-end;

      .undo-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: var(--space-2) 16px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--color-warning), var(--color-warning));
        color: var(--color-text-white);
        font-size: 12px;
        font-weight: 700;
        border: none;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        &:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        svg {
          flex-shrink: 0;
        }
      }
    }
  }
}

.diff-content {
  .diff-material-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border-light);
  }
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;

  th,
  td {
    &:nth-child(1) {
      width: 20%;
    }

    &:nth-child(2) {
      width: 25%;
    }

    &:nth-child(3) {
      width: 25%;
    }

    &:nth-child(4) {
      width: 30%;
    }
  }

  th {
    background: var(--color-bg-page);
    padding: var(--space-2-5) var(--space-3-5);
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 12px;
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: var(--space-2-5) var(--space-3-5);
    border-bottom: 1px solid var(--color-border-light);
    color: var(--color-text-primary);
  }

  .diff-row-changed {
    background: rgba(245, 158, 11, 0.04);
  }

  .diff-row-preview {
    background: rgba(59, 130, 246, 0.04);
  }

  .diff-field-label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .diff-highlight {
    background: rgba(245, 158, 11, 0.12);
    border-radius: 4px;
    padding: var(--space-0-5) var(--space-1-5);
    font-weight: 600;
    color: var(--color-warning);
  }

  .diff-same {
    font-size: 12px;
    color: var(--color-text-placeholder);
  }

  .diff-preview-value {
    font-weight: 600;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    text-align: center;

    &.preview-old {
      color: var(--color-info);
      background: rgba(59, 130, 246, 0.08);
      border-radius: 4px;
      padding: var(--space-0-5) 8px;
    }
  }
}

.diff-choice {
  display: flex;
  gap: 0;
  animation: choiceReset 0.3s ease-out;

  @keyframes choiceReset {
    0% {
      opacity: 0.5;
      transform: scale(0.95);
    }

    50% {
      opacity: 0.8;
      transform: scale(1.02);
    }

    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  :deep(.t-radio-group) {
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
  }

  :deep(.t-radio-button) {
    padding: 4px var(--space-3-5);
    font-size: 12px;
    font-weight: 600;
    border: none !important;
    background: var(--color-bg-page);
    color: var(--color-text-secondary);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 40px;
    text-align: center;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    &:hover {
      background: var(--color-border-light);
      color: var(--td-radio-bg-color, var(--color-info));

      &::after {
        opacity: 1;
      }
    }

    &.t-is-checked {
      background: var(--td-radio-bg-color, var(--color-info));
      color: var(--color-text-white);
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.25);
      transform: scale(1);

      &:hover {
        opacity: 0.9;
        color: var(--color-text-white);

        &::after {
          opacity: 0;
        }
      }

      &::after {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
        opacity: 1;
      }
    }
  }
}

.diff-dialog-header {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.diff-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2-5);
}

.diff-summary {
  margin-top: 16px;
  padding: 12px var(--space-3-5);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.04));
  border: 1px solid rgba(99, 102, 241, 0.15);
  display: flex;
  align-items: flex-start;
  gap: var(--space-2-5);

  .diff-summary-icon {
    color: var(--color-lavender);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .diff-summary-text {
    font-size: 13px;
    line-height: 1.6;

    .summary-label {
      font-weight: 600;
      color: var(--color-lavender);
      margin-right: var(--space-1-5);
    }

    .summary-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-0-5);
      margin-right: 8px;
      padding: 1px var(--space-1-5);
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.08);
      color: var(--color-primary-dark);
      font-weight: 500;

      small {
        font-size: 11px;
        color: var(--color-text-placeholder);
        font-weight: 400;
        margin-left: var(--space-1);
      }

      &.item-keep {
        background: rgba(59, 130, 246, 0.08);
        color: var(--color-info);
      }
    }
  }
}

.diff-cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 10px;
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: var(--color-border-light);
    border-color: var(--color-text-placeholder);
  }
}

.diff-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-warning), var(--color-warning));
  color: var(--color-text-white);
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all $transition-normal;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.4s ease, height 0.4s ease;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
    background: linear-gradient(135deg, var(--color-warning), var(--color-warning-dark));

    &::before {
      width: 200px;
      height: 200px;
    }
  }

  &:active {
    transform: translateY(0) scale(0.98);
    box-shadow: 0 1px 4px rgba(245, 158, 11, 0.25);
  }

  svg {
    transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);

    @keyframes resetRotate {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(-360deg);
      }
    }
  }

  &:hover svg {
    transform: rotate(-15deg);
  }

  &:active svg {
    animation: resetRotate 0.4s ease-out;
  }
}

.diff-apply-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-white);
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all $transition-normal;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px $overlay-emerald-25;
  }
}

.reparse-model-option {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  width: 100%;
  min-height: 36px;
  padding: var(--space-0-5) 0;

  .reparse-model-logo {
    width: 24px;
    height: 24px;
    min-width: 24px;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-border-light);

    img {
      width: 16px;
      height: 16px;
      object-fit: contain;
      display: block;
    }

    .reparse-model-fallback {
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
    }

    img+.reparse-model-fallback {
      display: none;
    }
  }

  .reparse-model-name {
    flex: 1;
    font-size: 13px;
    color: var(--color-text-primary);
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
  }

  .reparse-model-check {
    flex-shrink: 0;
    margin-left: 4px;
    width: 16px !important;
    height: 16px !important;
  }
}

@media (max-width: 900px) {
  .ai-panel {
    padding: 20px;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes progressSlide {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(350%);
  }
}

.save-template-dialog-header {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.save-template-form {
  padding: 8px 0;

  .form-field {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: var(--space-1-5);

    .required {
      color: var(--color-danger);
    }
  }
}
</style>

<style lang="scss">
.reparse-dropdown-popup {
  min-width: 160px !important;
  width: auto !important;
  border: none !important;
  outline: none !important;
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.12) !important;

  .t-dropdown__menu {
    min-width: 140px !important;
    width: auto !important;
    padding: 4px !important;
    border: none !important;
    outline: none !important;
  }

  .t-dropdown__item {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    padding: var(--space-2) 12px !important;
    min-height: 38px;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;

    &:hover {
      background-color: var(--color-border-light) !important;
    }

    &.t-dropdown__item--active {
      color: var(--color-primary-dark) !important;
      background-color: transparent !important;
    }
  }

  .reparse-model-option {
    display: inline-flex !important;
    align-items: center !important;
    gap: 16px !important;
    width: auto !important;
    min-width: 120px !important;
    max-width: none !important;
    overflow: visible !important;
    text-overflow: clip !important;

    .reparse-model-logo {
      width: 22px !important;
      height: 22px !important;
      min-width: 22px !important;
      border-radius: var(--radius-sm) !important;
      overflow: hidden !important;
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: var(--color-border-light) !important;

      img {
        width: 15px !important;
        height: 15px !important;
        object-fit: contain !important;
        display: block !important;
      }

      .reparse-model-fallback {
        font-size: 11px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
      }

      img+.reparse-model-fallback {
        display: none !important;
      }
    }

    .reparse-model-name {
      flex: 0 0 auto !important;
      font-size: 13px !important;
      color: var(--color-text-primary) !important;
      font-weight: 500 !important;
      line-height: 1.3 !important;
      white-space: nowrap !important;
      text-overflow: clip !important;
      overflow: visible !important;
    }

    .reparse-model-check {
      width: 16px !important;
      height: 16px !important;
      flex-shrink: 0 !important;
      margin-left: 4px !important;
      color: var(--color-primary) !important;
    }
  }
}
</style>
