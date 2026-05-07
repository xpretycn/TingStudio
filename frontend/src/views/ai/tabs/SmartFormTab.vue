<template>
  <div class="smart-form-tab">
    <section class="ai-panel">
      <div class="ai-panel-bg"></div>
      <div class="ai-panel-content">
        <div class="ai-header">
          <div class="ai-icon">
            <t-icon name="cloud" />
          </div>
          <div class="ai-title-group">
            <h3 class="ai-title">AI 智能配方解析</h3>
            <p class="ai-subtitle">支持识别 Excel、图片及手写草稿</p>
          </div>
          <div v-if="selectedFile || aiStore.parseResult || aiStore.parseAborted" class="ai-header-status"
            :class="{ 'aborted-status': aiStore.parseAborted }">
            <div v-if="aiStore.parseLoading" class="status-indicator status-indicator--loading">
              <span class="status-dot status-dot--pulse"></span>
              <span class="status-text">正在解析: {{ selectedFile?.name || '文件' }}</span>
            </div>
            <div v-else-if="aiStore.parseAborted" class="status-indicator status-indicator--aborted">
              <span class="status-dot status-dot--aborted"></span>
              <span class="status-text">已终止: {{ selectedFile?.name || '文件' }}</span>
            </div>
            <div v-else-if="aiStore.parseResult" class="status-indicator status-indicator--done">
              <span class="status-dot status-dot--done"></span>
              <span class="status-text">已解析: {{ selectedFile?.name || '配方数据' }}</span>
            </div>
            <div v-else-if="selectedFile" class="status-indicator status-indicator--ready">
              <span class="status-dot status-dot--ready"></span>
              <span class="status-text">待解析: {{ selectedFile.name }}</span>
            </div>
          </div>
        </div>

        <div class="ai-body">
          <div v-if="!aiStore.parseLoading && !aiStore.parseResult && !aiStore.parseAborted" class="upload-zone"
            :class="{ 'drag-over': isDragOver }" @click="triggerFileInput" @dragover.prevent="handleDragOver"
            @dragleave="handleDragLeave" @drop.prevent="handleDrop">
            <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp"
              style="display: none" @change="handleFileChange" />
            <div class="upload-icon">
              <t-icon name="upload" />
            </div>
            <div class="upload-text">
              <p class="upload-title">点击或拖拽文件上传</p>
              <p class="upload-hint">支持 .xlsx, .jpg, .png (最大 10MB)</p>
            </div>
          </div>

          <div v-if="selectedFile && !aiStore.parseLoading && !aiStore.parseResult && !aiStore.parseAborted"
            class="file-selected-row">
            <div class="file-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
              <span class="file-format">{{ getFileFormat(selectedFile.name) }}</span>
            </div>
            <div class="file-actions">
              <button class="parse-btn" :disabled="!aiStore.selectedModel || aiStore.parseLoading" @click="handleParse">
                <svg v-if="!aiStore.parseLoading" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                  <path d="M2 17L12 22L22 17" />
                  <path d="M2 12L12 17L22 12" />
                </svg>
                {{ aiStore.parseLoading ? '解析中...' : '开始解析' }}
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

          <div v-if="aiStore.parseLoading" class="parsing-progress">
            <div class="progress-header">
              <span class="progress-status">{{ aiStore.parseAborted ? 'AI 解析已终止' : 'AI 正在解析文件内容...' }}</span>
              <div class="progress-right">
                <span class="progress-percent">{{ parseProgressText }}</span>
                <span class="progress-timer" :key="parseElapsedTime">{{ parseElapsedTimeFormatted }}</span>
                <button v-if="!aiStore.parseAborted" class="abort-btn" @click="handleAbortParse" title="终止解析"
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
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
              <span class="model-version">{{ aiStore.getVersionLabel(aiStore.selectedVersion || currentModelInfo.model)
              }}</span>
              <span v-if="currentModelInfo.supportsVision" class="model-feature">支持图片识别</span>
            </div>
          </div>

          <div v-if="aiStore.parseError" class="parse-error">
            <t-icon name="error-circle" />
            <span>{{ aiStore.parseError }}</span>
          </div>

          <div ref="resultRef" v-if="aiStore.parseResult && !submitSuccess && !aiStore.parseAborted"
            class="analysis-result">
            <div class="result-two-col">
              <div class="result-left">
                <div class="info-card">
                  <div class="card-header">
                    <t-icon name="file-copy" size="14px" />
                    <span>配方基本信息</span>
                  </div>
                  <div class="card-body">
                    <div class="info-row info-row--editable">
                      <span class="info-label">配方名称</span>
                      <div class="info-input-wrap">
                        <t-input v-model="editedName" class="info-input" size="small"
                          :class="{ 'info-input--changed': editedName !== (aiStore.parseResult.name || '') }"
                          placeholder="请输入配方名称" clearable align="right" />
                        <button v-if="editedName !== (aiStore.parseResult.name || '')" type="button" class="undo-btn"
                          title="撤销修改，恢复AI识别值" @click="editedName = aiStore.parseResult.name || ''">
                          <t-icon name="rollback" size="14px" />
                        </button>
                      </div>
                    </div>
                    <div class="info-row">
                      <span class="info-label">配方时间</span>
                      <span class="info-value" :class="{ 'info-value--empty': !aiStore.parseResult.formulaDate }">
                        {{ aiStore.parseResult.formulaDate || '未识别' }}
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">业务员</span>
                      <div class="info-value-wrap">
                        <span class="info-value"
                          :class="{ 'info-value--empty': !aiStore.parseResult.salesmanName, 'info-value--warn': salesmanNotMatched }">
                          {{ aiStore.parseResult.salesmanName || '未识别' }}
                        </span>
                        <t-tag v-if="salesmanNotMatched && !aiStore.parseResult.salesmanName" theme="warning"
                          variant="light" size="small" style="margin-left: 6px; cursor: pointer;"
                          @click="openQuickCreateSalesman">
                          未识别，点击创建
                        </t-tag>
                        <t-tag v-else-if="salesmanNotMatched && aiStore.parseResult.salesmanName" theme="warning"
                          variant="light" size="small" style="margin-left: 6px; cursor: pointer;"
                          @click="openQuickCreateSalesman">
                          未匹配，点击创建
                        </t-tag>
                      </div>
                    </div>
                    <div class="info-row info-row--editable">
                      <span class="info-label">成品重量（规格）</span>
                      <div class="info-input-wrap">
                        <t-input-number v-model="editedWeight" class="info-input-number" size="small" :min="0"
                          :precision="0" theme="normal" align="right"
                          :class="{ 'info-input--changed': editedWeight !== (aiStore.parseResult.finishedWeight || 0) }" />
                        <span class="info-input-unit">g</span>
                        <button v-if="editedWeight !== (aiStore.parseResult.finishedWeight || 0)" type="button"
                          class="undo-btn" title="撤销修改，恢复AI识别值"
                          @click="editedWeight = aiStore.parseResult.finishedWeight || 0">
                          <t-icon name="rollback" size="14px" />
                        </button>
                      </div>
                    </div>
                    <div class="info-row info-row--editable">
                      <span class="info-label">主料含量比系数</span>
                      <div class="info-input-wrap">
                        <t-input-number v-model="editedRatioFactor" class="info-input-number" size="small" :min="0.15"
                          :max="0.25" :decimal-places="2" theme="normal" align="right" placeholder="0.18"
                          :class="{ 'info-input--changed': editedRatioFactor !== 0.18 }" />
                        <button v-if="editedRatioFactor !== 0.18" type="button" class="undo-btn" title="撤销修改，恢复默认值0.18"
                          @click="editedRatioFactor = 0.18">
                          <t-icon name="rollback" size="14px" />
                        </button>
                      </div>
                    </div>
                    <div class="info-row info-row--editable">
                      <span class="info-label">辅料含量比系数</span>
                      <div class="info-input-wrap">
                        <t-input-number v-model="editedSupplementRatioFactor" class="info-input-number" size="small"
                          :min="0.5" :max="1.5" :decimal-places="2" theme="normal" align="right" placeholder="1.0"
                          :class="{ 'info-input--changed': editedSupplementRatioFactor !== 1.0 }" />
                        <button v-if="editedSupplementRatioFactor !== 1.0" type="button" class="undo-btn"
                          title="撤销修改，恢复默认值1.0" @click="editedSupplementRatioFactor = 1.0">
                          <t-icon name="rollback" size="14px" />
                        </button>
                      </div>
                    </div>
                    <div v-if="aiStore.parseResult.usage" class="info-row">
                      <span class="info-label">Token 用量</span>
                      <span class="info-badge">{{ aiStore.parseResult.usage.totalTokens }}</span>
                    </div>
                    <div class="info-row info-row--desc">
                      <span class="info-label">配方描述</span>
                      <div class="info-desc" :class="{ 'info-value--empty': !aiStore.parseResult.description }">
                        {{ aiStore.parseResult.description || '未识别' }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="salesmanNotMatched" class="info-card info-card--warning">
                  <div class="card-header card-header--warning">
                    <t-icon name="error-circle" size="14px" />
                    <span v-if="aiStore.parseResult.salesmanName">业务员「{{ aiStore.parseResult.salesmanName
                    }}」未匹配到系统数据库</span>
                    <span v-else>AI 未能识别业务员信息，请手动创建或选择</span>
                  </div>
                  <div class="card-body">
                    <div class="salesman-match-actions">
                      <t-select v-model="selectedSalesmanId" placeholder="选择已有业务员" :loading="salesmanLoading" filterable
                        clearable class="salesman-select" @change="onSelectSalesman">
                        <t-option v-for="s in salesmenList" :key="s.id" :value="s.id" :label="s.name" />
                      </t-select>
                      <button class="warning-action-btn" @click="openQuickCreateSalesman">
                        <t-icon name="add" size="14px" />
                        快速创建业务员
                      </button>
                    </div>
                  </div>
                </div>

                <div class="info-card">
                  <div class="card-header">
                    <t-icon name="currency-exchange" size="14px" />
                    <span>配方报价</span>
                  </div>
                  <div class="card-body">
                    <div class="quote-toolbar" v-if="quoteAdjustedCount > 0 || qtyAdjustedCount > 0">
                      <span class="qt-badge-info">
                        <svg v-if="quoteAdjustedCount > 0" viewBox="0 0 14 14" width="13" height="13">
                          <path d="M7 1L8.75 5.25L13 6L9.75 9L10.5 13.25L7 11L3.5 13.25L4.25 9L1 6L5.25 5.25Z"
                            fill="#f59e0b" />
                        </svg>
                        <template v-if="quoteAdjustedCount > 0">{{ quoteAdjustedCount }} 项单价已调整</template>
                        <template v-if="quoteAdjustedCount > 0 && qtyAdjustedCount > 0">，</template>
                        <svg v-if="qtyAdjustedCount > 0" viewBox="0 0 14 14" width="13" height="13">
                          <path d="M7 1L8.75 5.25L13 6L9.75 9L10.5 13.25L7 11L3.5 13.25L4.25 9L1 6L5.25 5.25Z"
                            fill="#3b82f6" />
                        </svg>
                        <template v-if="qtyAdjustedCount > 0">{{ qtyAdjustedCount }} 项用量已调整</template>
                      </span>
                      <button class="qt-reset-btn" @click="handleRestoreAllAdjustments" title="将所有已调整的单价和用量恢复为原始值">
                        <t-icon name="refresh" size="14px" /> 全部恢复
                      </button>
                    </div>
                    <p v-if="quoteMissingPrices.length > 0" class="quote-warn-text">
                      <t-icon name="error-circle" /> 以下原料未录入单价：{{ quoteMissingPrices.join('、') }}
                    </p>
                    <div class="quote-summary">
                      <div class="qs-row qs-total">
                        <label><t-icon name="outbox" size="14px" class="qs-label-icon" /> 原料成本</label>
                        <span>¥{{ quoteMaterialTotal.toFixed(2) }}</span>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="shop" size="14px" class="qs-label-icon" /> 包材费用</label>
                        <div class="qs-input-wrap"><t-input-number v-model="packagingPrice" :min="0" :precision="2"
                            size="small" theme="normal" style="width:200px" /><span class="qs-unit">元</span></div>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="edit-1" size="14px" class="qs-label-icon" /> 其他费用</label>
                        <div class="qs-input-wrap"><t-input-number v-model="otherPrice" :min="0" :precision="2"
                            size="small" theme="normal" style="width:200px" /><span class="qs-unit">元</span></div>
                      </div>
                      <div class="qs-divider"></div>
                      <div class="qs-row qs-subtotal">
                        <label><t-icon name="wallet" size="14px" class="qs-label-icon" /> 成本小计</label>
                        <span>¥{{ quoteCostSubtotal.toFixed(2) }}</span>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="chart-pie" size="14px" class="qs-label-icon" /> 利润率</label>
                        <div class="qs-input-wrap"><t-input-number v-model="profitMargin" :min="0" :max="999"
                            :precision="1" size="small" theme="normal" style="width:200px" /><span
                            class="qs-unit">%</span></div>
                      </div>
                      <div class="qs-divider qs-divider--bold"></div>
                      <div class="qs-row qs-final">
                        <label><t-icon name="money-filled" size="16px" class="qs-label-icon qs-label-icon--final" />
                          最终报价</label>
                        <span>¥{{ quoteTotalPrice.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="getConfidenceItems().length" class="info-card">
                  <div class="card-header">
                    <t-icon name="chart-bar" size="14px" />
                    <span>解析可信度概览</span>
                  </div>
                  <div class="card-body">
                    <div class="confidence-items">
                      <div v-for="(item, idx) in getConfidenceItems()" :key="idx" class="confidence-item"
                        :class="'confidence-item--' + item.level">
                        <span class="ci-label">{{ item.label }}</span>
                        <div class="ci-bar-wrap">
                          <div class="ci-bar">
                            <div class="ci-fill" :style="{ width: item.value + '%' }"></div>
                          </div>
                          <span class="ci-value">{{ item.value }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div class="result-right">
                <div class="info-card materials-card">
                  <div class="card-header">
                    <t-icon name="precise-monitor" size="14px" />
                    <span>原料信息</span>
                    <span class="card-header-badge">{{ aiStore.parseResult.materials?.length || 0 }} 种</span>
                  </div>
                  <div class="card-body card-body--materials">
                    <div class="materials-table">
                      <div class="materials-header">
                        <span class="col-name">原料名称</span>
                        <span class="col-qty">用量</span>
                        <span class="col-unit">单位</span>
                        <span class="col-price">单价(/kg)</span>
                        <span class="col-adjust">调整</span>
                        <span class="col-subtotal">小计</span>
                        <span class="col-status">状态</span>
                      </div>
                      <div v-for="(m, idx) in aiStore.parseResult.materials" :key="idx" class="materials-row"
                        :class="{ 'materials-row--warn': getMaterialPrice(m) == null, 'materials-row--adjusted': quoteItems[idx]?.isAdjusted, 'materials-row--qty-adjusted': quoteItems[idx]?.isQtyAdjusted, 'materials-row--restore-flash': restoreFlashIdx === idx, 'materials-row--new': !m.name && newMaterialSelectIdx === idx }">
                        <template v-if="!m.name && newMaterialSelectIdx === idx">
                          <t-select :value="m.materialId || undefined" placeholder="选择原料..." filterable
                            style="grid-column: 1 / -1; width: 100%;"
                            @change="(val: string) => onNewMaterialSelected(idx, val)">
                            <t-option v-for="mat in availableMaterialsForSelect" :key="mat.id" :value="mat.id"
                              :label="mat.name" />
                          </t-select>
                        </template>
                        <template v-else>
                          <span class="col-name">{{ m.name || '(待选择)' }}</span>
                          <div class="col-qty-edit">
                            <t-input-number :model-value="quoteItems[idx]?.quantity ?? m.quantity ?? 0"
                              @change="(val: number) => handleQtyAdjust(idx, val)" :min="0" :decimal-places="2"
                              size="small" theme="normal" style="width: 72px"
                              :class="{ 'col-qty-input--invalid': (quoteItems[idx]?.quantity ?? m.quantity) <= 0 }" />
                          </div>
                          <span class="col-unit">{{ m.unit || 'g' }}</span>
                          <span class="col-price" v-if="getMaterialPrice(m) == null">
                            <span class="col-price-missing">未录入</span>
                          </span>
                          <div class="col-price-edit" v-else>
                            <t-input-number :model-value="quoteItems[idx]?.unitPrice ?? getMaterialPrice(m)"
                              @change="(val: number) => handlePriceAdjust(idx, val)" :min="0" :precision="2"
                              size="small" theme="normal" style="width: 80px" />
                            <span class="col-price-unit">/kg</span>
                          </div>
                          <span class="col-adjust">
                            <span v-if="quoteItems[idx]?.isQtyAdjusted" class="col-adjust-badge col-adjust-badge--qty"
                              :title="'原始用量: ' + (quoteItems[idx]?.originalQuantity ?? '--')">
                              <svg viewBox="0 0 12 12" width="10" height="10">
                                <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="#3b82f6" />
                              </svg>
                              量
                            </span>
                            <button v-if="quoteItems[idx]?.isQtyAdjusted" type="button" class="col-restore-btn"
                              :class="{ 'col-restore-btn--flash': restoreFlashIdx === idx }"
                              @click="handleRestoreSingleQty(idx)"
                              :title="'恢复原始用量: ' + (quoteItems[idx]?.originalQuantity ?? '--')">
                              <t-icon name="rollback" size="12px" />
                            </button>
                            <span v-if="quoteItems[idx]?.isAdjusted" class="col-adjust-badge"
                              :title="'基价: ¥' + (quoteItems[idx]?.basePrice ?? '--') + '/kg'">
                              <svg viewBox="0 0 12 12" width="10" height="10">
                                <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="#d97706" />
                              </svg>
                              价
                            </span>
                            <button v-if="quoteItems[idx]?.isAdjusted" type="button" class="col-restore-btn"
                              :class="{ 'col-restore-btn--flash': restoreFlashIdx === idx }"
                              @click="handleRestoreSinglePrice(idx)"
                              :title="'恢复基价: ¥' + (quoteItems[idx]?.basePrice ?? '--') + '/kg'">
                              <t-icon name="rollback" size="12px" />
                            </button>
                          </span>
                          <span class="col-subtotal"
                            :class="{ 'col-price--missing': getQuoteItemSubtotal(idx) == null }">
                            {{ getQuoteItemSubtotal(idx) != null ? '¥' + getQuoteItemSubtotal(idx)!.toFixed(2) : '—' }}
                          </span>
                          <span class="col-status">
                            <t-tag v-if="m.matched" theme="success" variant="light" size="small">已匹配</t-tag>
                            <template v-else>
                              <t-tag theme="warning" variant="light" size="small">未匹配</t-tag>
                              <button type="button" class="quick-add-material-btn" @click="openQuickCreateMaterial(m)"
                                title="快速录入此原料">
                                <t-icon name="add" size="12px" />
                              </button>
                            </template>
                            <button type="button" class="remove-material-btn" @click="removeParsedMaterial(idx)"
                              title="移除此原料">
                              <t-icon name="close" size="12px" />
                            </button>
                          </span>
                        </template>
                      </div>
                      <div class="materials-add-row">
                        <button class="add-material-inline-btn" @click="addParsedMaterial">
                          <t-icon name="add" size="14px" style="color: #10b981" />
                          添加原料
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="info-card info-card--actions">
                  <div v-if="submitBlockReasons.length" class="submit-block-reasons">
                    <div class="sbr-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>以下问题需解决后方可提交</span>
                    </div>
                    <div v-for="(reason, idx) in submitBlockReasons" :key="idx" class="sbr-item"
                      :class="'sbr-item--' + reason.type">
                      <span class="sbr-dot"></span>
                      <span class="sbr-text">{{ reason.message }}</span>
                    </div>
                  </div>
                  <t-button theme="success" block @click="backfillData" class="backfill-btn"
                    :loading="formulaStore.loading"
                    :disabled="formulaStore.loading || submitBlockReasons.some(r => r.type === 'error')"
                    aria-label="确认并直接提交配方到后端">
                    <template #icon>
                      <t-icon name="check-circle" />
                    </template>
                    {{submitBlockReasons.some(r => r.type === 'error') ? `存在 ${submitBlockReasons.filter(r => r.type
                      ===
                      'error').length} 项错误，无法提交` : '确认生成配方'}}
                  </t-button>
                  <div class="secondary-actions">
                    <button type="button" class="action-btn action-btn--ghost" @click.stop="resetUpload"
                      aria-label="重新选择文件">
                      <t-icon name="refresh" />
                      重新选择
                    </button>
                    <button type="button" class="action-btn action-btn--ghost" @click.stop="clearResult"
                      aria-label="清空AI解析结果">
                      <t-icon name="delete" />
                      清空
                    </button>
                    <t-dropdown trigger="hover"
                      :popup-props="{ appendToBody: true, placement: 'bottom-right', overlayClassName: 'reparse-dropdown-popup' }">
                      <button type="button" class="action-btn action-btn--ghost action-btn--reparse" @click.stop>
                        <t-icon name="play-circle" />
                        重新解析
                        <t-icon name="chevron-down" size="12px" style="margin-left: 2px" />
                      </button>
                      <t-dropdown-menu>
                        <t-dropdown-item v-for="model in aiStore.models" :key="model.provider" :value="model.provider"
                          @click="(ctx: any) => handleReparseWithModel({ value: ctx.value })">
                          <div class="reparse-model-option">
                            <div class="reparse-model-logo">
                              <img loading="lazy" :src="getModelLogo(model)" :alt="model.name"
                                @error="(e: Event) => handleLogoError(e, model)" />
                              <span class="reparse-model-fallback" :style="{ color: getFallbackColor(model) }">
                                {{ getFallbackLetter(model) }}
                              </span>
                            </div>
                            <span class="reparse-model-name">{{ model.name }}</span>
                            <svg v-if="aiStore.selectedModel === model.provider" width="16" height="16"
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                              stroke-linecap="round" stroke-linejoin="round" class="reparse-model-check">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        </t-dropdown-item>
                      </t-dropdown-menu>
                    </t-dropdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showFormSection && aiStore.parseResult && !submitSuccess && !aiStore.parseAborted" class="form-section">
      <div class="form-card">
        <div class="form-card-header">
          <h4 class="form-card-title">
            <t-icon name="edit-1" style="color: #10b981" />
            创建配方
          </h4>
          <button class="form-close-btn" @click="showFormSection = false">
            <t-icon name="close" size="16px" />
          </button>
        </div>

        <t-form ref="formRef" :data="formData" :rules="formRules" label-align="top" @submit="handleFormSubmit">
          <t-form-item label="配方名称" name="name">
            <t-input v-model="formData.name" placeholder="请输入配方名称" :class="{ 'input-error': formErrors.name }"
              clearable />
            <span v-if="formErrors.name" class="inline-error">{{ formErrors.name }}</span>
          </t-form-item>

          <t-form-item label="业务员" name="salesmanId">
            <t-select v-model="formData.salesmanId" placeholder="选择业务员" :loading="salesmanLoading" filterable clearable>
              <t-option v-for="s in salesmenList" :key="s.id" :value="s.id" :label="s.name" />
              <template #panelTopContent>
                <div class="quick-create-salesman" @click="openQuickCreateSalesman">
                  <t-icon name="add" size="14px" style="color: #10b981" />
                  快速创建业务员
                </div>
              </template>
            </t-select>
            <t-alert v-if="salesmanNotMatched && !formData.salesmanId" theme="warning"
              style="margin-top: 8px; border-radius: 10px; font-size: 12px;">
              <template v-if="parsedSalesmanName">业务员「{{ parsedSalesmanName }}」不在系统中，请选择已有业务员或</template>
              <template v-else>AI 未能识别业务员信息，请选择已有业务员或</template>
              <a style="color: #10b981; cursor: pointer; font-weight: 600;" @click="openQuickCreateSalesman">快速创建</a>
            </t-alert>
          </t-form-item>

          <t-form-item label="成品重量 (g)" name="finishedWeight">
            <t-input-number v-model="formData.finishedWeight" :min="0" :decimal-places="2" placeholder="请输入成品重量"
              theme="normal" :class="{ 'input-error': formErrors.finishedWeight }" style="width: 100%" />
            <span v-if="formErrors.finishedWeight" class="inline-error">{{ formErrors.finishedWeight }}</span>
          </t-form-item>

          <t-form-item label="主料含量比系数" name="ratioFactor">
            <t-input-number v-model="formData.ratioFactor" :min="0.15" :max="0.25" :decimal-places="2"
              placeholder="0.18" theme="normal" :class="{ 'input-error': formErrors.ratioFactor }"
              style="width: 100%" />
            <p class="field-help">用于营养成分含量比计算，范围0.15-0.25</p>
            <span v-if="formErrors.ratioFactor" class="inline-error">{{ formErrors.ratioFactor }}</span>
          </t-form-item>

          <t-form-item label="辅料含量比系数" name="supplementRatioFactor">
            <t-input-number v-model="formData.supplementRatioFactor" :min="0.5" :max="1.5" :decimal-places="2"
              placeholder="1.0" theme="normal" :class="{ 'input-error': formErrors.supplementRatioFactor }"
              style="width: 100%" />
            <p class="field-help">用于营养成分含量比计算，范围0.5-1.5</p>
            <span v-if="formErrors.supplementRatioFactor" class="inline-error">{{ formErrors.supplementRatioFactor
            }}</span>
          </t-form-item>

          <t-form-item label="原料列表" name="materials">
            <div class="materials-form-list">
              <div v-for="(mat, idx) in formData.materials" :key="idx" class="material-form-row"
                :class="{ 'material-form-row--error': formErrors[`material_${idx}`] }">
                <t-input v-model="mat.materialName" placeholder="原料名称" style="flex: 2"
                  :class="{ 'input-error': !mat.materialName?.trim() }" />
                <t-input-number v-model="mat.quantity" :min="0" :decimal-places="2" placeholder="用量" theme="normal"
                  style="flex: 1" :class="{ 'input-error': mat.quantity == null || mat.quantity <= 0 }" />
                <t-input v-model="mat.unit" placeholder="单位" style="flex: 0.6" />
                <button class="material-remove-btn" @click="removeMaterial(idx)">
                  <t-icon name="close" size="14px" />
                </button>
              </div>
              <button class="add-material-btn" @click="addMaterial">
                <t-icon name="add" size="14px" style="color: #10b981" />
                添加原料
              </button>
            </div>
          </t-form-item>

          <t-form-item label="备注" name="description">
            <t-textarea v-model="formData.description" placeholder="可选备注信息" :autosize="{ minRows: 2, maxRows: 5 }" />
          </t-form-item>

          <t-form-item>
            <div class="form-submit-row">
              <t-button theme="primary" type="submit" :loading="formulaStore.loading" :disabled="formulaStore.loading">
                <template #icon>
                  <t-icon name="check" />
                </template>
                提交创建
              </t-button>
              <t-button variant="outline" @click="showFormSection = false">取消</t-button>
            </div>
          </t-form-item>
        </t-form>
      </div>
    </div>

    <div v-if="submitSuccess" class="submit-success-section">
      <div class="success-card">
        <div class="success-icon">
          <t-icon name="check-circle" size="48px" style="color: #10b981" />
        </div>
        <h4 class="success-title">配方创建成功</h4>
        <p class="success-desc">配方「{{ submittedName }}」已成功创建并保存。</p>

        <div v-if="uploadedFileInfo" class="success-file-info">
          <div class="sfi-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span class="sfi-title">已上传文件</span>
          </div>
          <div class="sfi-body">
            <span class="sfi-name">{{ uploadedFileInfo.fileName }}</span>
            <span class="sfi-size">{{ formatFileSize(uploadedFileInfo.fileSize) }}</span>
          </div>
        </div>

        <div class="success-actions">
          <button class="add-formula-btn" @click="handleCreateAnother">
            <t-icon name="add" size="14px" />
            继续创建
          </button>
          <button v-if="uploadedFileInfo" class="view-file-btn" @click="goToFileDetail">
            <t-icon name="browse" size="14px" />
            查看文件详情
          </button>
        </div>
      </div>
    </div>

    <QuickCreateSalesmanDrawer v-model:visible="showQuickCreateSalesman" :default-name="parsedSalesmanName"
      @created="onSalesmanCreated" />

    <QuickCreateMaterialDrawer v-model:visible="showQuickCreateMaterial" :material-data="quickCreateMaterialData"
      @created="onMaterialCreated" />

    <t-alert v-if="!aiStore.models.length && !aiStore.parseLoading" message="未配置 AI 模型" theme="warning"
      style="border-radius: 12px; margin-top: 16px">
      <template #default>
        请在后端 .env 文件中配置至少一个 AI 模型的 API Key：
        <code>AI_DASHSCOPE_API_KEY</code>、
        <code>AI_ZHIPU_API_KEY</code> 或
        <code>AI_DEEPSEEK_API_KEY</code>
      </template>
    </t-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAiStore } from '@/stores/ai';
import { useFormulaStore } from '@/stores/formula';
import { useMaterialStore } from '@/stores/material';
import { MessagePlugin } from 'tdesign-vue-next';
import QuickCreateSalesmanDrawer from '@/components/QuickCreateSalesmanDrawer.vue';
import QuickCreateMaterialDrawer from '@/components/QuickCreateMaterialDrawer.vue';
import type { ParsedFormula, ParsedMaterial } from '@/api/ai';
import type { FormulaForm } from '@/api/formula';
import type { Salesman } from '@/api/salesman';
import { salesmanApi } from '@/api/salesman';
import { fileApi } from '@/api/file';

const emit = defineEmits<{
  (e: 'activity-add', item: { type: 'success' | 'info' | 'warning'; title: string; desc: string; time: string; }): void;
}>();

const aiStore = useAiStore();
const formulaStore = useFormulaStore();
const materialStore = useMaterialStore();

const safeParseResult = computed(() => {
  return aiStore.parseAborted ? null : aiStore.parseResult;
});

const route = useRoute();
const router = useRouter();

const resetAllData = () => {
  selectedFile.value = null;
  showFormSection.value = false;
  submitSuccess.value = false;
  submittedName.value = '';
  editedName.value = '';
  editedWeight.value = 0;
  editedRatioFactor.value = 0.18;
  editedSupplementRatioFactor.value = 1.0;
  quoteAdjustments.value = {};
  qtyAdjustments.value = {};
  packagingPrice.value = 5;
  otherPrice.value = 3;
  profitMargin.value = 20;
  formData.value = {
    name: '',
    salesmanId: '',
    finishedWeight: 0,
    ratioFactor: 0.18,
    supplementRatioFactor: 1.0,
    materials: [],
    description: '',
  };
  aiStore.parseResult = null as any;
};

watch(() => route.path, (newPath, oldPath) => {
  if (oldPath && !oldPath.startsWith('/ai-assistant') && newPath.startsWith('/ai-assistant')) {
    resetAllData();
  }
});

onMounted(() => {
  aiStore.parseResult = null as any;
  selectedFile.value = null;
  submitSuccess.value = false;
  showFormSection.value = false;
  editedName.value = '';
  editedWeight.value = 0;
  editedRatioFactor.value = 0.18;
  editedSupplementRatioFactor.value = 1.0;
  quoteAdjustments.value = {};
  qtyAdjustments.value = {};
  if (fileInputRef.value) fileInputRef.value.value = '';
  if (aiStore.selectedModel && aiStore.modelVersions.length === 0) {
    aiStore.loadModelVersions(aiStore.selectedModel);
  }
});

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

const fileInputRef = ref<HTMLInputElement | null>(null);
const resultRef = ref<HTMLElement | null>(null);
const isDragOver = ref(false);
const selectedFile = ref<File | null>(null);
const showFormSection = ref(false);
const submitSuccess = ref(false);
const submittedName = ref('');
const uploadedFileInfo = ref<{ fileId: string; fileName: string; fileSize: number; } | null>(null);
const formRef = ref();
const parseStartTime = ref(Date.now());
const parseElapsedTime = ref(0);
let parseTimer: ReturnType<typeof setInterval> | null = null;

const salesmanLoading = ref(false);
const allSalesmen = ref<Salesman[]>([]);
const salesmenList = computed(() => allSalesmen.value);
const showQuickCreateSalesman = ref(false);
const selectedSalesmanId = ref<string>('');
const showQuickCreateMaterial = ref(false);
const quickCreateMaterialData = ref<ParsedMaterial | null>(null);
const parsedSalesmanName = ref('');

const normalizeName = (name: string): string => {
  if (!name) return '';
  return name.replace(/[\uFEFF\u200B\u200C\u200D\u00A0\u3000]/g, '').trim();
};

const salesmanNotMatched = computed(() => {
  const result = aiStore.parseResult;
  if (!result) return false;
  if (!result.salesmanName) return true;
  const name = normalizeName(result.salesmanName);
  if (!name) return true;
  return !salesmenList.value.find(
    (s: any) => {
      const sName = normalizeName(s.name);
      return sName === name || sName.includes(name) || name.includes(sName);
    }
  );
});

interface FormMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
}

const formData = ref<{
  name: string;
  salesmanId: string;
  finishedWeight: number | undefined;
  ratioFactor: number;
  supplementRatioFactor: number;
  materials: FormMaterial[];
  description: string;
}>({
  name: '',
  salesmanId: '',
  finishedWeight: undefined,
  ratioFactor: 0.18,
  supplementRatioFactor: 1.0,
  materials: [],
  description: '',
});

const formErrors = ref<Record<string, string>>({});

const formRules = {
  name: [{ required: true, message: '配方名称不能为空', trigger: 'blur' }],
  salesmanId: [{ required: true, message: '请选择业务员', trigger: 'change' }],
};

const submitBlockReasons = computed(() => {
  const reasons: { type: 'error' | 'warning'; message: string; }[] = [];
  const data = aiStore.parseResult;
  if (!data) return reasons;

  if (!editedName.value?.trim() && !data.name?.trim()) {
    reasons.push({ type: 'error', message: '配方名称不能为空' });
  }

  if (!editedWeight.value || editedWeight.value <= 0) {
    reasons.push({ type: 'error', message: '成品重量必须大于 0' });
  }

  if (editedRatioFactor.value < 0.15 || editedRatioFactor.value > 0.25) {
    reasons.push({ type: 'warning', message: '主料含量比系数超出范围（0.15-0.25）' });
  }

  if (editedSupplementRatioFactor.value < 0.5 || editedSupplementRatioFactor.value > 1.5) {
    reasons.push({ type: 'warning', message: '辅料含量比系数超出范围（0.5-1.5）' });
  }

  if (salesmanNotMatched.value) {
    if (data.salesmanName) {
      reasons.push({ type: 'error', message: `业务员「${data.salesmanName}」未匹配到系统数据库，请选择或创建` });
    } else {
      reasons.push({ type: 'error', message: '业务员信息缺失，请选择或创建业务员' });
    }
  }

  const materials = data.materials || [];
  const validMaterials = materials.filter((m: ParsedMaterial) => m.name?.trim());
  if (validMaterials.length === 0) {
    reasons.push({ type: 'error', message: '至少需要一种有效原料' });
  }

  const unmatchedMaterials = validMaterials.filter((m: ParsedMaterial) => !m.matched);
  if (unmatchedMaterials.length > 0) {
    const names = unmatchedMaterials.map((m: ParsedMaterial) => m.name).join('、');
    reasons.push({ type: 'error', message: `${unmatchedMaterials.length} 种原料未匹配：${names}，请先录入或匹配` });
  }

  const zeroQtyMaterials = materials.reduce((acc: ParsedMaterial[], m: ParsedMaterial, idx: number) => {
    if (!m.name?.trim()) return acc;
    const effectiveQty = quoteItems.value[idx]?.quantity ?? m.quantity ?? 0;
    if (!effectiveQty || effectiveQty <= 0) {
      acc.push(m);
    }
    return acc;
  }, [] as ParsedMaterial[]);
  if (zeroQtyMaterials.length > 0) {
    const names = zeroQtyMaterials.map((m: ParsedMaterial) => m.name).join('、');
    reasons.push({ type: 'warning', message: `${zeroQtyMaterials.length} 种原料用量为0或缺失：${names}` });
  }

  return reasons;
});

const getMaterialPrice = (m: ParsedMaterial, allMats?: any[]): number | null => {
  if (m.unitPrice != null) return m.unitPrice;
  const mats = allMats || materialStore.allMaterials;
  if (!mats?.length) return null;
  const found = mats.find((x: any) =>
    x.name === m.name || x.id === m.materialId
  );
  if (found?.unitPrice != null) return found.unitPrice;
  if (m.materialId) {
    const byId = mats.find((x: any) => x.id === m.materialId);
    if (byId?.unitPrice != null) return byId.unitPrice;
  }
  const nameLike = mats.find((x: any) =>
    x.name.includes(m.name) || m.name.includes(x.name)
  );
  return nameLike?.unitPrice ?? null;
};

interface QuoteItem {
  name: string;
  quantity: number;
  originalQuantity: number;
  unit: string;
  unitPrice: number | null;
  basePrice: number | null;
  isAdjusted: boolean;
  isQtyAdjusted: boolean;
  subtotal: number;
}

const quoteAdjustments = ref<Record<number, number>>({});
const qtyAdjustments = ref<Record<number, number>>({});
const packagingPrice = ref(5);
const otherPrice = ref(3);
const profitMargin = ref(20);
const editedName = ref('');
const editedWeight = ref(0);
const editedRatioFactor = ref(0.18);
const editedSupplementRatioFactor = ref(1.0);

const quoteItems = computed<QuoteItem[]>(() => {
  const data = aiStore.parseResult;
  const allMats = materialStore.allMaterials;
  if (!data?.materials?.length) return [];
  return data.materials.map((m: ParsedMaterial, idx: number) => {
    const basePrice = getMaterialPrice(m, allMats);
    const adjustedPrice = quoteAdjustments.value[idx];
    const effectivePrice = (adjustedPrice != null && adjustedPrice !== basePrice) ? adjustedPrice : basePrice;
    const isAdjusted = adjustedPrice != null && adjustedPrice !== basePrice;
    const originalQuantity = m.quantity || 0;
    const adjustedQty = qtyAdjustments.value[idx];
    const effectiveQty = (adjustedQty != null && adjustedQty !== originalQuantity) ? adjustedQty : originalQuantity;
    const isQtyAdjusted = adjustedQty != null && adjustedQty !== originalQuantity;
    const subtotal = effectivePrice != null ? Number((effectiveQty / 1000 * effectivePrice).toFixed(4)) : 0;
    return {
      name: m.name || '',
      quantity: effectiveQty,
      originalQuantity,
      unit: m.unit || 'g',
      unitPrice: effectivePrice,
      basePrice,
      isAdjusted,
      isQtyAdjusted,
      subtotal,
    };
  });
});

const quoteMaterialTotal = computed(() => {
  return quoteItems.value.reduce((s, m) => s + (m.subtotal || 0), 0);
});

const quoteCostSubtotal = computed(() => {
  return Number((quoteMaterialTotal.value + (packagingPrice.value || 0) + (otherPrice.value || 0)).toFixed(4));
});

const quoteTotalPrice = computed(() => {
  const margin = profitMargin.value ?? 20;
  return Number((quoteCostSubtotal.value * (1 + margin / 100)).toFixed(4));
});

const quoteMissingPrices = computed(() => {
  return quoteItems.value.filter(m => m.unitPrice === null).map(m => m.name);
});

const quoteAdjustedCount = computed(() => {
  return quoteItems.value.filter(m => m.isAdjusted).length;
});

const qtyAdjustedCount = computed(() => {
  return quoteItems.value.filter(m => m.isQtyAdjusted).length;
});

const handlePriceAdjust = (idx: number, val: number | undefined) => {
  const data = aiStore.parseResult;
  if (!data?.materials?.[idx]) return;
  const basePrice = getMaterialPrice(data.materials[idx]);
  if (val === undefined || val === null || val === basePrice) {
    const newAdj = { ...quoteAdjustments.value };
    delete newAdj[idx];
    quoteAdjustments.value = newAdj;
  } else {
    quoteAdjustments.value = { ...quoteAdjustments.value, [idx]: val };
  }
};

const handleQtyAdjust = (idx: number, val: number | undefined) => {
  const data = aiStore.parseResult;
  if (!data?.materials?.[idx]) return;
  const originalQty = data.materials[idx].quantity || 0;
  if (val === undefined || val === null || val === originalQty) {
    const newAdj = { ...qtyAdjustments.value };
    delete newAdj[idx];
    qtyAdjustments.value = newAdj;
  } else {
    qtyAdjustments.value = { ...qtyAdjustments.value, [idx]: val };
  }
};

const handleRestoreSingleQty = (idx: number) => {
  const data = aiStore.parseResult;
  if (!data?.materials?.[idx]) return;
  const originalQty = data.materials[idx].quantity || 0;

  const newAdj = { ...qtyAdjustments.value };
  delete newAdj[idx];
  qtyAdjustments.value = newAdj;

  restoreFlashIdx.value = idx;
  setTimeout(() => {
    restoreFlashIdx.value = null;
  }, 600);

  MessagePlugin.success(`已恢复「${data.materials[idx].name}」用量为原始值 ${originalQty}`);
};

const handleRestoreAllAdjustments = () => {
  const priceCount = Object.keys(quoteAdjustments.value).length;
  const qtyCount = Object.keys(qtyAdjustments.value).length;
  quoteAdjustments.value = {};
  qtyAdjustments.value = {};
  const parts: string[] = [];
  if (priceCount > 0) parts.push(`${priceCount} 项单价`);
  if (qtyCount > 0) parts.push(`${qtyCount} 项用量`);
  if (parts.length > 0) MessagePlugin.success(`已恢复 ${parts.join('、')}为原始值`);
};

const restoreFlashIdx = ref<number | null>(null);

const handleRestoreSinglePrice = (idx: number) => {
  const data = aiStore.parseResult;
  if (!data?.materials?.[idx]) return;
  const basePrice = getMaterialPrice(data.materials[idx]);
  if (!quoteAdjustments.value[idx]) return;

  const newAdj = { ...quoteAdjustments.value };
  delete newAdj[idx];
  quoteAdjustments.value = newAdj;

  restoreFlashIdx.value = idx;
  setTimeout(() => {
    restoreFlashIdx.value = null;
  }, 600);

  MessagePlugin.success(`已恢复「${data.materials[idx].name}」单价为基价 ¥${basePrice?.toFixed(2) ?? '--'}`);
};

const getQuoteItemSubtotal = (idx: number): number | null => {
  const item = quoteItems.value[idx];
  if (!item || item.unitPrice == null) return null;
  return item.subtotal;
};

const parseElapsedTimeFormatted = computed(() => {
  if (!aiStore.parseLoading) return '0s';
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
  if (!aiStore.parseLoading || aiStore.parseAborted) return;

  aiStore.abortParseFormula();
  stopParseTimer();

  showFormSection.value = false;
  editedName.value = '';
  editedWeight.value = 0;

  MessagePlugin.warning({
    content: 'AI 解析已终止',
    duration: 3000,
  });
};

watch(() => aiStore.parseLoading, (loading) => {
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
  if (!aiStore.parseLoading) return '';
  const elapsed = Date.now() - parseStartTime.value;
  const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
  const versionValue = aiStore.selectedVersion || currentModel?.model || '';
  const versionLabel = aiStore.getVersionLabel(versionValue) || versionValue;
  const modelLabel = currentModel ? `${currentModel.name} · ${versionLabel}` : aiStore.selectedModel;
  if (elapsed < 2000) return `连接 ${modelLabel} 服务...`;
  if (elapsed < 5000) return `上传文件至 ${modelLabel}...`;
  if (elapsed < 10000) return `${modelLabel} 分析中...`;
  if (elapsed < 20000) return `${modelLabel} 提取配方数据...`;
  return `${modelLabel} 即将完成...`;
});

const parseProgressHint = computed(() => {
  const hints = [
    '正在识别文档结构与内容',
    '提取原料名称与用量信息',
    '匹配系统原料数据库',
    '计算配方比例与权重',
    '生成结构化数据'
  ];
  if (!aiStore.parseLoading) return '';
  const stage = Math.floor((Date.now() - parseStartTime.value) / 4000) % hints.length;
  const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
  const modelInfo = currentModel ? ` · ${currentModel.name}${currentModel.supportsVision ? ' (支持图片)' : ''}` : '';
  return hints[stage] + '...' + modelInfo;
});

const getConfidenceLevel = (confidence: number): string => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
};

const currentModelInfo = computed(() => {
  if (!aiStore.selectedModel) return null;
  return aiStore.models.find(m => m.provider === aiStore.selectedModel) || null;
});

const getConfidenceItems = () => {
  const data = aiStore.parseResult;
  if (!data) return [];
  const items: { label: string; value: number; level: string; }[] = [];
  const baseConf = data.confidence != null ? Math.round(data.confidence * 100) : null;
  if (data.formulaDate) {
    const v = baseConf ?? 100;
    items.push({ label: '配方时间', value: v, level: getConfidenceLevel(v / 100) });
  } else {
    items.push({ label: '配方时间', value: 0, level: 'low' });
  }
  if (data.salesmanName) {
    const v = baseConf ?? 100;
    items.push({ label: '业务员', value: v, level: getConfidenceLevel(v / 100) });
  } else {
    items.push({ label: '业务员', value: 0, level: 'low' });
  }
  if (data.finishedWeight) {
    const v = baseConf ?? 100;
    items.push({ label: '成品重量', value: v, level: getConfidenceLevel(v / 100) });
  } else {
    items.push({ label: '成品重量', value: 0, level: 'low' });
  }
  if (data.materials?.length) {
    const matchedCount = data.materials.filter((m: any) => m.matched).length;
    const v = matchedCount > 0 ? Math.round((matchedCount / data.materials.length) * 100) : 0;
    items.push({ label: '原料清单', value: v, level: getConfidenceLevel(v / 100) });
  }
  if (data.description) {
    const v = baseConf ?? 100;
    items.push({ label: '配方描述', value: v, level: getConfidenceLevel(v / 100) });
  }
  return items;
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
  qwen: { letter: 'Q', color: '#6366f1' },
  alibabacloud: { letter: 'Q', color: '#ff6a00' },
  zhipu: { letter: 'Z', color: '#4268fa' },
  baidu: { letter: 'B', color: '#2932e1' },
  bytedance: { letter: 'D', color: '#25f4ee' },
  moonshot: { letter: 'M', color: '#000' },
  minimax: { letter: 'M', color: '#615ced' },
  tencent: { letter: 'T', color: '#0052d9' },
};

const getModelSlug = (model: any): string => {
  const provider = (model.provider || '').toLowerCase();
  const name = (model.name || '').toLowerCase();
  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (provider.includes(key) || name.includes(key)) {
      return slug.startsWith('http') ? key : slug;
    }
  }
  return 'openai';
};

const getModelLogo = (model: any): string => {
  const slug = getModelSlug(model);
  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
};

const getFallbackLetter = (model: any): string => {
  const slug = getModelSlug(model);
  return FALLBACK_ICONS[slug]?.letter || '?';
};

const getFallbackColor = (model: any): string => {
  const slug = getModelSlug(model);
  return FALLBACK_ICONS[slug]?.color || '#94a3b8';
};

const handleLogoError = (e: Event, _model: any) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const wrap = img.parentElement;
  if (wrap) {
    const fallback = wrap.querySelector('.model-fallback');
    if (fallback) (fallback as HTMLElement).style.display = 'flex';
  }
};

const triggerFileInput = () => {
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

const handleFileChange = (e: Event) => {
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
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTS.includes(ext)) {
    const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
    if (!currentModel?.supportsVision) {
      const visionModel = aiStore.models.find(m => m.supportsVision);
      if (visionModel) {
        aiStore.selectedModel = visionModel.provider;
        MessagePlugin.info(`已自动切换到视觉模型「${visionModel.name}」以支持图片解析`);
      }
    }
  }
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
  if (!materialStore.allMaterials?.length) {
    await materialStore.fetchAllForSelect();
  }
  showFormSection.value = false;
  submitSuccess.value = false;
  parseStartTime.value = Date.now();
  await aiStore.parseFormula(selectedFile.value);
  if (aiStore.parseResult) {
    emit('activity-add', {
      type: 'success',
      title: '配方解析完成',
      desc: `成功解析配方「${aiStore.parseResult.name}」，识别 ${aiStore.parseResult.materials?.length || 0} 种原料`,
      time: new Date().toLocaleTimeString(),
    });
  }
};

const resetUpload = () => {
  selectedFile.value = null;
  aiStore.clearParseResult();
  if (fileInputRef.value) fileInputRef.value.value = '';
  nextTick(() => {
    fileInputRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const clearResult = () => {
  selectedFile.value = null;
  aiStore.clearParseResult();
  quoteAdjustments.value = {};
  qtyAdjustments.value = {};
  packagingPrice.value = 5;
  otherPrice.value = 3;
  profitMargin.value = 20;
  editedName.value = '';
  editedWeight.value = 0;
  editedRatioFactor.value = 0.18;
  editedSupplementRatioFactor.value = 1.0;
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const handleReparseWithModel = async (data: { value: string; }) => {
  aiStore.selectedModel = data.value;
  aiStore.selectedVersion = '';
  await aiStore.loadModelVersions(data.value);
  aiStore.clearParseResult();
  if (selectedFile.value) {
    nextTick(() => {
      const progressEl = document.querySelector('.parsing-progress');
      if (progressEl) {
        progressEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        resultRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    parseStartTime.value = Date.now();
    await aiStore.parseFormula(selectedFile.value);
  }
};

const backfillData = async () => {
  const data = aiStore.parseResult;
  if (!data?.name && !editedName.value) {
    MessagePlugin.warning('配方名称不能为空');
    return;
  }

  if (!editedWeight.value || editedWeight.value <= 0) {
    MessagePlugin.warning('成品重量必须大于 0');
    return;
  }

  const materials = (data?.materials || []).filter((m: ParsedMaterial) => m.name?.trim());
  if (materials.length === 0) {
    MessagePlugin.warning('至少需要一种有效原料');
    return;
  }

  const unmatchedMaterials = materials.filter((m: ParsedMaterial) => !m.matched);
  if (unmatchedMaterials.length > 0) {
    MessagePlugin.warning(`存在 ${unmatchedMaterials.length} 种未匹配原料，请先匹配或录入`);
    return;
  }

  if (salesmanNotMatched.value) {
    MessagePlugin.warning('业务员未匹配，请先创建或选择业务员');
    return;
  }

  let salesmanId = '';
  if (data?.salesmanName) {
    const salesmanName = normalizeName(data.salesmanName);
    parsedSalesmanName.value = salesmanName;
    const matched = salesmenList.value.find(
      (s: any) => {
        const sName = normalizeName(s.name);
        return sName === salesmanName || sName.includes(salesmanName) || salesmanName.includes(sName);
      }
    );
    if (matched) {
      salesmanId = matched.id;
    }
  }

  if (!salesmanId) {
    MessagePlugin.warning('未匹配到业务员，请先创建或选择');
    return;
  }

  const materialsPayload = materials.map((m: ParsedMaterial, idx: number) => ({
    materialId: m.materialId || '',
    materialName: m.name,
    quantity: quoteItems.value[idx]?.quantity ?? m.quantity ?? 0,
  }));

  const payload: FormulaForm = {
    name: (editedName.value || data?.name || '').trim(),
    salesmanId,
    finishedWeight: editedWeight.value || 0,
    ratioFactor: editedRatioFactor.value,
    supplementRatioFactor: editedSupplementRatioFactor.value,
    materials: materialsPayload,
    description: data?.description || undefined,
    packagingPrice: packagingPrice.value,
    otherPrice: otherPrice.value,
    profitMargin: profitMargin.value,
    originalName: data?.name || undefined,
    originalWeight: data?.finishedWeight || undefined,
  };

  const result = await formulaStore.createFormula(payload);

  if (result.success) {
    submitSuccess.value = true;
    submittedName.value = payload.name;
    MessagePlugin.success(`配方「${payload.name}」创建成功`);

    if (selectedFile.value) {
      try {
        const fd = new FormData();
        fd.append('file', selectedFile.value);
        fd.append('fileType', 'formula');
        const uploaded = await fileApi.upload(fd);
        const formulaId = (result as any).data?.id;
        if (formulaId && uploaded?.fileId) {
          await fileApi.link(uploaded.fileId, { relatedId: formulaId, relatedType: 'formula' });
          uploadedFileInfo.value = {
            fileId: uploaded.fileId,
            fileName: selectedFile.value.name,
            fileSize: selectedFile.value.size,
          };
          MessagePlugin.success('原文件已上传并关联至配方');
        }
      } catch (fileErr: any) {
        console.warn('文件上传或关联失败:', fileErr);
        MessagePlugin.warning('配方已创建，但原文件上传失败');
      }
    }

    emit('activity-add', {
      type: 'success',
      title: '配方创建成功',
      desc: `配方「${payload.name}」已成功创建${selectedFile.value ? '，原文件已上传关联' : ''}`,
      time: new Date().toLocaleTimeString(),
    });
  } else {
    MessagePlugin.error(result.message || '创建配方失败');
    emit('activity-add', {
      type: 'warning',
      title: '配方创建失败',
      desc: result.message || '创建配方时发生错误',
      time: new Date().toLocaleTimeString(),
    });
  }
};

const populateFormFromResult = (result: ParsedFormula) => {
  formData.value.name = result.name || '';
  formData.value.finishedWeight = result.finishedWeight || undefined;
  formData.value.ratioFactor = editedRatioFactor.value;
  formData.value.supplementRatioFactor = editedSupplementRatioFactor.value;
  formData.value.description = result.description || '';
  formData.value.salesmanId = '';
  editedName.value = result.name || '';
  editedWeight.value = result.finishedWeight || 0;

  if (result.salesmanName) {
    const salesmanName = normalizeName(result.salesmanName);
    parsedSalesmanName.value = salesmanName;
    const matched = salesmenList.value.find(
      (s: any) => {
        const sName = normalizeName(s.name);
        return sName === salesmanName || sName.includes(salesmanName) || salesmanName.includes(sName);
      }
    );
    if (matched) {
      formData.value.salesmanId = matched.id;
    }
  }

  formData.value.materials = (result.materials || []).map((m: ParsedMaterial) => ({
    materialId: m.materialId || '',
    materialName: m.name || '',
    quantity: m.quantity || 0,
    unit: m.unit || 'g',
  }));

  formErrors.value = {};
};

watch(() => aiStore.parseResult, (newVal) => {
  if (newVal && !aiStore.parseAborted) {
    populateFormFromResult(newVal);
    quoteAdjustments.value = {};
    qtyAdjustments.value = {};
    packagingPrice.value = 5;
    otherPrice.value = 3;
    profitMargin.value = 20;
  }
}, { immediate: true });

const openQuickCreateSalesman = () => {
  if (aiStore.parseResult?.salesmanName) {
    parsedSalesmanName.value = aiStore.parseResult.salesmanName;
  }
  showQuickCreateSalesman.value = true;
};

const onSelectSalesman = (salesmanId: string) => {
  if (!salesmanId || !aiStore.parseResult) return;
  const salesman = salesmenList.value.find((s: any) => s.id === salesmanId);
  if (!salesman) return;
  aiStore.parseResult.salesmanName = salesman.name;
  parsedSalesmanName.value = salesman.name;
  formData.value.salesmanId = salesman.id;
  MessagePlugin.success(`已选择业务员「${salesman.name}」，匹配完成`);
};

const openQuickCreateMaterial = (material: ParsedMaterial) => {
  quickCreateMaterialData.value = { ...material };
  showQuickCreateMaterial.value = true;
};

/**
 * 快速录入原料创建完成后的回调
 * 1. 刷新原料列表（用于报价计算中的单价查询）
 * 2. 更新 parseResult 中对应原料的 matched 状态为 true
 *    （因为新创建的原料已存在于数据库中，AI 解析结果中的该原料应标记为已匹配）
 */
const onMaterialCreated = async (material: any) => {
  await materialStore.fetchAllForSelect();

  if (aiStore.parseResult?.materials?.length && material?.name) {
    const matName = material.name;
    for (const m of aiStore.parseResult.materials) {
      if (!m.matched && (m.name === matName || m.name.includes(matName) || matName.includes(m.name))) {
        m.matched = true;
        m.materialId = material.id;
        break;
      }
    }
  }

  quoteAdjustments.value = {};
  qtyAdjustments.value = {};
};

const onSalesmanCreated = async (salesman: Salesman) => {
  await loadSalesmen();
  const created = salesmenList.value.find(s => s.id === salesman.id || s.name === salesman.name);
  if (created) {
    formData.value.salesmanId = created.id;
    selectedSalesmanId.value = created.id;
    if (aiStore.parseResult) {
      aiStore.parseResult.salesmanName = created.name;
      parsedSalesmanName.value = created.name;
    }
    MessagePlugin.success(`业务员「${created.name}」已创建并自动选中`);
  }
};

const loadSalesmen = async () => {
  salesmanLoading.value = true;
  try {
    const res = await salesmanApi.getList({ status: 'active', pageSize: 9999 });
    allSalesmen.value = res.list || [];
  } catch (error) {
    console.error('加载业务员列表失败:', error);
    allSalesmen.value = [];
  } finally {
    salesmanLoading.value = false;
  }
};

loadSalesmen();

if (!materialStore.allMaterials?.length) {
  materialStore.fetchAllForSelect();
}

const addMaterial = () => {
  formData.value.materials.push({
    materialId: '',
    materialName: '',
    quantity: 0,
    unit: 'g',
  });
};

const addParsedMaterial = () => {
  if (!aiStore.parseResult) return;
  if (!aiStore.parseResult.materials) {
    aiStore.parseResult.materials = [];
  }
  const newIdx = aiStore.parseResult.materials.length;
  aiStore.parseResult.materials.push({
    name: '',
    quantity: 0,
    unit: 'g',
    matched: false,
    materialId: '',
  });
  nextTick(() => {
    newMaterialSelectIdx.value = newIdx;
  });
};

const newMaterialSelectIdx = ref<number | null>(null);

const availableMaterialsForSelect = computed(() => {
  if (!aiStore.parseResult?.materials?.length) return materialStore.allMaterials;
  const existingIds = new Set(
    aiStore.parseResult.materials
      .filter((m: any) => m.materialId)
      .map((m: any) => m.materialId)
  );
  const existingNames = new Set(
    aiStore.parseResult.materials
      .filter((m: any) => m.name?.trim())
      .map((m: any) => m.name.trim())
  );
  return materialStore.allMaterials.filter((m: any) => {
    if (existingIds.has(m.id)) return false;
    if (existingNames.has(m.name.trim())) return false;
    return true;
  });
});

const onNewMaterialSelected = (idx: number, materialId: string) => {
  if (!aiStore.parseResult?.materials?.[idx] || !materialId) return;
  const material = materialStore.allMaterials.find((m: any) => m.id === materialId);
  if (!material) return;

  const mat = aiStore.parseResult.materials[idx];
  mat.name = material.name;
  mat.materialId = material.id;
  mat.unit = material.unit || 'g';
  mat.matched = true;
  mat.quantity = mat.quantity || 0;

  newMaterialSelectIdx.value = null;
  MessagePlugin.success(`已选择原料「${material.name}」`);
};

const removeParsedMaterial = (idx: number) => {
  if (!aiStore.parseResult?.materials) return;
  aiStore.parseResult.materials.splice(idx, 1);
  if (newMaterialSelectIdx.value === idx) {
    newMaterialSelectIdx.value = null;
  } else if (newMaterialSelectIdx.value != null && newMaterialSelectIdx.value > idx) {
    newMaterialSelectIdx.value--;
  }
};

const removeMaterial = (idx: number) => {
  formData.value.materials.splice(idx, 1);
};

const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  let valid = true;

  if (!formData.value.name?.trim()) {
    errors.name = '配方名称不能为空';
    valid = false;
  }

  if (!formData.value.salesmanId) {
    errors.salesmanId = '请选择业务员';
    valid = false;
  }

  if (formData.value.finishedWeight != null && formData.value.finishedWeight <= 0) {
    errors.finishedWeight = '成品重量必须大于 0';
    valid = false;
  }

  if (formData.value.ratioFactor < 0.15 || formData.value.ratioFactor > 0.25) {
    errors.ratioFactor = '主料含量比系数范围为0.15-0.25';
    valid = false;
  }

  if (formData.value.supplementRatioFactor < 0.5 || formData.value.supplementRatioFactor > 1.5) {
    errors.supplementRatioFactor = '辅料含量比系数范围为0.5-1.5';
    valid = false;
  }

  formData.value.materials.forEach((mat, idx) => {
    if (!mat.materialName?.trim()) {
      errors[`material_${idx}`] = '原料名称不能为空';
      valid = false;
    }
    if (mat.quantity == null || mat.quantity <= 0) {
      errors[`material_${idx}`] = '用量必须大于 0';
      valid = false;
    }
  });

  formErrors.value = errors;
  return valid;
};

const handleFormSubmit = async () => {
  if (!validateForm()) {
    MessagePlugin.warning('请检查表单中的错误项');
    return;
  }

  const materialsPayload = formData.value.materials
    .filter(m => m.materialName?.trim() && m.quantity > 0)
    .map(m => ({
      materialId: m.materialId || '',
      materialName: m.materialName,
      quantity: m.quantity,
    }));

  const payload: FormulaForm = {
    name: formData.value.name.trim(),
    salesmanId: formData.value.salesmanId,
    finishedWeight: formData.value.finishedWeight || 0,
    ratioFactor: formData.value.ratioFactor,
    supplementRatioFactor: formData.value.supplementRatioFactor,
    materials: materialsPayload,
    description: formData.value.description || undefined,
    packagingPrice: packagingPrice.value,
    otherPrice: otherPrice.value,
    profitMargin: profitMargin.value,
    originalName: aiStore.parseResult?.name || undefined,
    originalWeight: aiStore.parseResult?.finishedWeight || undefined,
  };

  const result = await formulaStore.createFormula(payload);

  if (result.success) {
    submitSuccess.value = true;
    submittedName.value = formData.value.name.trim();
    MessagePlugin.success(`配方「${submittedName.value}」创建成功`);
    emit('activity-add', {
      type: 'success',
      title: '配方创建成功',
      desc: `配方「${submittedName.value}」已成功创建`,
      time: new Date().toLocaleTimeString(),
    });
  } else {
    MessagePlugin.error(result.message || '创建配方失败');
    emit('activity-add', {
      type: 'warning',
      title: '配方创建失败',
      desc: result.message || '创建配方时发生错误',
      time: new Date().toLocaleTimeString(),
    });
  }
};

const handleCreateAnother = () => {
  submitSuccess.value = false;
  uploadedFileInfo.value = null;
  showFormSection.value = false;
  aiStore.clearParseResult();
  selectedFile.value = null;
  quoteAdjustments.value = {};
  qtyAdjustments.value = {};
  packagingPrice.value = 5;
  otherPrice.value = 3;
  profitMargin.value = 20;
  editedName.value = '';
  editedWeight.value = 0;
  editedRatioFactor.value = 0.18;
  editedSupplementRatioFactor.value = 1.0;
  if (fileInputRef.value) fileInputRef.value.value = '';
  formData.value = {
    name: '',
    salesmanId: '',
    finishedWeight: undefined,
    ratioFactor: 0.18,
    supplementRatioFactor: 1.0,
    materials: [],
    description: '',
  };
  formErrors.value = {};
};

const goToFileDetail = () => {
  if (uploadedFileInfo.value?.fileId) {
    router.push({ name: 'FileDetail', params: { id: uploadedFileInfo.value.fileId } });
  }
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss' as *;

.smart-form-tab {
  animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.ai-panel {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, $border-color-light 100%);
  padding: 32px;
  border-radius: 2.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px $overlay-emerald-06;
  color: #334155;
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
        color: #fff;
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
        color: $text-placeholder;
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
        gap: 6px;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      .status-indicator--loading {
        background: rgba(59, 130, 246, 0.08);
        color: #3b82f6;
        border: 1px solid rgba(59, 130, 246, 0.15);
      }

      .status-indicator--done {
        background: rgba(16, 185, 129, 0.08);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.15);
      }

      .status-indicator--ready {
        background: rgba(245, 158, 11, 0.08);
        color: #d97706;
        border: 1px solid rgba(245, 158, 11, 0.15);
      }

      .status-indicator--aborted {
        background: rgba(239, 68, 68, 0.08);
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.15);
        margin-top: 24px;
        padding: 10px 14px;
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
        background: #3b82f6;
        animation: dot-pulse 1.4s ease-in-out infinite;
      }

      .status-dot--done {
        background: #10b981;
      }

      .status-dot--ready {
        background: #f59e0b;
        animation: dot-blink 2s ease-in-out infinite;
      }

      .status-dot--aborted {
        background: #ef4444;
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
      border-radius: 24px;
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
          color: #64748b;
          margin: 4px 0 0;
        }
      }
    }

    .file-selected-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding: 14px 18px;
      background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
      border: 1px solid #bbf7d0;
      border-radius: 12px;

      .file-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #334155;
        font-weight: 500;

        .file-name {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 400;
        }

        .file-format {
          padding: 1px 6px;
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
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
      gap: 6px;
      padding: 8px 18px;
      border-radius: 10px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
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
      background: #fff;
      color: #94a3b8;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background: #fef2f2;
        color: #ef4444;
      }

      &--with-text {
        width: auto;
        height: auto;
        padding: 8px 18px;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        background: #fff;
        color: #94a3b8;

        &:hover {
          background: #fef2f2;
          color: #ef4444;
          border-color: #fecaca;
        }
      }
    }

    .parsing-progress {
      padding: 24px;
      background: $overlay-emerald-04;
      border-radius: 24px;
      border: 1px solid rgba(148, 163, 184, 0.18);

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .progress-status {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
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
          padding: 2px 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          font-family: 'SF Mono', 'Fira Code', monospace;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
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
          gap: 5px;
          padding: 5px 14px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
          margin-left: 10px;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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
        gap: 6px;
        padding: 8px 12px;
        background: rgba(16, 185, 129, 0.06);
        border-radius: 8px;
        margin-bottom: 12px;

        .progress-file-name {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .progress-file-size {
          font-size: 11px;
          color: #94a3b8;
          flex-shrink: 0;
        }
      }

      .progress-bar {
        height: 6px;
        background: rgba(148, 163, 184, 0.20);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 12px;

        .progress-fill {
          height: 100%;
          background: $gradient-emerald-light;
          background-size: 200% 100%;
          border-radius: 3px;

          &--indeterminate {
            width: 40% !important;
            animation: progressSlide 1.5s ease-in-out infinite;
          }
        }
      }

      .progress-hint {
        font-size: 10px;
        color: #64748b;
        font-style: italic;
        margin: 0;
      }

      .progress-model-info {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        padding: 6px 10px;
        background: rgba(99, 102, 241, 0.06);
        border: 1px solid rgba(99, 102, 241, 0.12);
        border-radius: 8px;
        color: #6366f1;
        font-size: 11px;

        svg {
          flex-shrink: 0;
          opacity: 0.7;
        }

        .model-name {
          font-weight: 700;
        }

        .model-version {
          color: #94a3b8;
          font-family: monospace;
          font-size: 10px;
        }

        .model-feature {
          padding: 1px 6px;
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
      gap: 8px;
      padding: 14px 18px;
      background: $color-danger-bg;
      border: 1px solid $color-danger-medium;
      border-radius: 16px;
      color: #dc2626;
      font-size: 12px;
      font-weight: 600;

      .t-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
    }

    .analysis-result {
      .result-two-col {
        display: flex;
        gap: 20px;
        align-items: flex-start;
      }

      .result-left {
        width: 40%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .result-right {
        width: 60%;
        min-width: 0;
      }
    }
  }
}

.info-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  overflow: hidden;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 800;
    color: $emerald-600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: $overlay-emerald-04;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);

    .t-icon {
      color: $emerald-500;
    }

    &--warning {
      background: #fffbeb;
      color: #b45309;
      border-bottom-color: #fde68a;

      .t-icon {
        color: #f59e0b;
      }
    }

    .card-header-badge {
      margin-left: auto;
      padding: 1px 8px;
      background: $overlay-emerald-12;
      color: $emerald-600;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
  }

  .card-body {
    padding: 14px 16px;

    &--materials {
      padding: 0;
    }
  }

  &--warning {
    border-color: #fcd34d;
  }

  &--actions {
    margin-top: 16px;
    border: none;
    background: transparent;
    border-radius: 0;
    overflow: visible;

    &:hover {
      box-shadow: none;
    }

    .card-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 12px;

  .info-label {
    color: #64748b;
    flex-shrink: 0;
    font-weight: 500;
  }

  .info-value {
    font-weight: 700;
    color: #334155;
    text-align: right;

    &--primary {
      font-size: 14px;
      color: #0f172a;
    }

    &--empty {
      color: $text-placeholder;
      font-weight: 500;
    }

    &--warn {
      color: #d97706;
    }
  }

  .info-value-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .info-badge {
    padding: 2px 8px;
    background: $overlay-emerald-12;
    color: $emerald-600;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
  }

  &--desc {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 0;

    .info-label {
      font-weight: 600;
      color: #475569;
    }
  }

  &--editable {
    align-items: center;
    gap: 8px;
    padding: 6px 0;

    .info-label {
      font-weight: 600;
      color: #475569;
      flex-shrink: 0;
      white-space: nowrap;
    }
  }
}

.info-input {
  width: 100%;
  min-width: 0;

  :deep(.t-input__inner) {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    padding: 4px 8px;
    border-radius: 8px;
    text-align: right !important;
  }

  :deep(.t-input) {
    text-align: right;
  }

  &--changed {
    :deep(.t-input__inner) {
      border-color: #d97706;
      background: #fffbeb;
    }
  }
}

.info-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 200px;
  flex-shrink: 0;
  justify-content: flex-end;
}

.undo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
  animation: undo-btn-in 0.2s ease;

  &:hover {
    background: #fef3c7;
    border-color: #f59e0b;
    color: #d97706;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.92);
  }
}

@keyframes undo-btn-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.info-input-number {
  width: 100%;
  min-width: 0;

  :deep(.t-input-number) {
    width: 100%;
  }

  :deep(.t-input-number .t-input__inner) {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    padding: 4px 8px;
    text-align: right !important;
  }

  :deep(.t-input-number .t-input__wrap) {
    text-align: right;
  }

  :deep(.t-input-number .t-input) {
    text-align: right;
  }

  &.info-input--changed {
    :deep(.t-input-number .t-input__inner) {
      border-color: #d97706;
      background: #fffbeb;
    }
  }
}

.info-input-unit {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  flex-shrink: 0;
}

.info-desc {
  font-size: 12px;
  line-height: 1.7;
  color: #334155;
  text-align: justify;
  word-break: break-word;
  white-space: pre-wrap;
  background: rgba(16, 185, 129, 0.04);
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 8px;
  padding: 10px 12px;
  width: 100%;
  max-height: 260px;
  overflow-y: auto;

  &.info-value--empty {
    color: $text-placeholder;
    font-weight: 500;
  }
}

.quote-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1px solid #fcd34d;

  .qt-badge-info {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #92400e;
    font-weight: 600;
  }

  .qt-reset-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 14px;
    border: 1px solid rgba(217, 119, 6, 0.25);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.8);
    color: #d97706;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #fff7ed;
      border-color: rgba(217, 119, 6, 0.45);
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
    }

    &:active {
      transform: scale(0.97);
    }
  }
}

.quote-warn-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #f59e0b;
  background: #fffbeb;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid #fde68a;
  margin-top: 8px;
}

.quote-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;

  .qs-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;

    label {
      color: #64748b;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    span {
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
      font-weight: 600;
      color: #334155;
    }
  }

  .qs-label-icon {
    color: #94a3b8;
    flex-shrink: 0;
  }

  .qs-label-icon--final {
    color: #059669;
  }

  .qs-total span,
  .qs-subtotal span {
    color: #059669;
  }

  .qs-final {
    label {
      color: #059669;
      font-weight: 700;
      font-size: 15px;
    }

    span {
      font-size: 18px;
      color: #059669;
      font-weight: 800;
    }
  }

  .qs-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;

    :deep(.t-input-number),
    :deep(.t-input-number .t-input__inner) {
      text-align: right;
    }
  }

  .qs-unit {
    font-size: 12px;
    color: #94a3b8;
  }

  .qs-divider {
    height: 1px;
    background: #e2e8f0;

    &--bold {
      background: #cbd5e1;
    }
  }
}

.confidence-items {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .confidence-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 8px;

    &--high {
      background: $overlay-emerald-06;
    }

    &--medium {
      background: $color-warning-bg;
    }

    &--low {
      background: $color-danger-bg;
    }

    .ci-label {
      width: 52px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }

    .ci-bar-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;

      .ci-bar {
        flex: 1;
        height: 4px;
        background: #e2e8f0;
        border-radius: 2px;
        overflow: hidden;

        .ci-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }
      }

      .ci-value {
        font-size: 11px;
        font-weight: 800;
        min-width: 28px;
        text-align: right;
      }
    }

    &--high .ci-fill {
      background: linear-gradient(90deg, $emerald-500, $emerald-400);
    }

    &--high .ci-value {
      color: $emerald-600;
    }

    &--medium .ci-fill {
      background: linear-gradient(90deg, #d97706, #f59e0b);
    }

    &--medium .ci-value {
      color: #d97706;
    }

    &--low .ci-fill {
      background: linear-gradient(90deg, #dc2626, #ef4444);
    }

    &--low .ci-value {
      color: #dc2626;
    }
  }
}

.warning-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all $transition-fast;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.3);
  }
}

.salesman-match-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  .salesman-select {
    min-width: 200px;
    flex: 1;
    max-width: 320px;
  }
}

.unmatched-list {
  list-style: none;
  padding: 0;
  margin: 0;

  .unmatched-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 12px;
    color: #92400e;
    border-bottom: 1px dashed #fde68a;

    &:last-child {
      border-bottom: none;
    }

    .unmatched-name {
      font-weight: 600;
    }

    .unmatched-qty {
      font-size: 11px;
      color: #a16207;
      background: #fef3c7;
      padding: 1px 8px;
      border-radius: 6px;
    }
  }
}

.backfill-btn {
  border-radius: 14px;
  font-weight: 700;
  font-size: 13px;
  padding: 10px 20px;
  height: auto;
  box-shadow: 0 4px 12px -2px $overlay-emerald-20;
  margin-bottom: 8px;
}

.submit-block-reasons {
  margin-bottom: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1px solid #fde68a;
  border-radius: 12px;

  .sbr-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
    color: #92400e;
    margin-bottom: 10px;
  }

  .sbr-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 5px 0 5px 20px;
    font-size: 12px;
    line-height: 1.5;

    .sbr-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 6px;
    }

    .sbr-text {
      flex: 1;
    }

    &--error {
      color: #dc2626;

      .sbr-dot {
        background: #ef4444;
      }
    }

    &--warning {
      color: #d97706;

      .sbr-dot {
        background: #f59e0b;
      }
    }
  }
}

.secondary-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;
    background: #fff;
    color: #475569;

    .t-icon {
      font-size: 14px;
    }

    &:hover {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    &--ghost {
      background: #fff;
      border: 1px solid #e2e8f0;

      .t-icon {
        color: #94a3b8;
      }

      &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;

        .t-icon {
          color: #64748b;
        }
      }
    }

    &--reparse {
      min-width: 0;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #059669;

      .t-icon {
        color: #059669;
      }

      &:hover {
        background: #dcfce7;
        border-color: #86efac;
        color: #047857;

        .t-icon {
          color: #047857;
        }
      }
    }
  }
}

.materials-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  .card-body--materials {
    flex: 1;
    overflow: visible;
    max-height: none;
  }
}

.materials-table {
  .materials-header {
    display: grid;
    grid-template-columns: 1fr 80px 40px 130px 90px 72px 90px;
    gap: 4px;
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 800;
    color: $emerald-600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: $overlay-emerald-08;
    position: sticky;
    top: 0;
    z-index: 1;

    .col-qty {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .col-price,
    .col-subtotal {
      text-align: right;
    }

    .col-status {
      text-align: right;
      padding-left: 4px;
    }

    .col-adjust {
      text-align: center;
    }
  }

  .materials-row {
    display: grid;
    grid-template-columns: 1fr 80px 40px 130px 90px 72px 90px;
    gap: 4px;
    padding: 9px 14px;
    font-size: 12px;
    color: #334155;
    border-top: 1px solid rgba(148, 163, 184, 0.08);
    align-items: center;

    &:nth-child(even) {
      background: rgba(248, 250, 252, 0.5);
    }

    &:hover {
      background: $overlay-emerald-04;
    }

    &--warn {
      .col-price-missing {
        color: #f59e0b;
        font-size: 11px;
        font-weight: 600;
      }
    }

    &--adjusted {
      border-left: 3px solid #f59e0b;
      background: linear-gradient(90deg, rgba(254, 243, 199, 0.5) 0%, transparent 100%);

      .col-name {
        color: #92400e;
        font-weight: 600;
      }
    }

    &--qty-adjusted {
      border-left: 3px solid #3b82f6;
      background: linear-gradient(90deg, rgba(219, 234, 254, 0.5) 0%, transparent 100%);

      .col-name {
        color: #1e40af;
        font-weight: 600;
      }
    }

    &--restore-flash {
      animation: row-restore-flash 0.6s ease;
    }

    &--new {
      background: rgba(16, 185, 129, 0.06);
      border-left: 3px solid #10b981;
    }

    .col-name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-qty {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .col-qty-edit {
      display: flex;
      align-items: center;
      justify-content: flex-end;

      :deep(.t-input-number) {
        width: 72px;

        .t-input__inner {
          text-align: right;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 6px;
        }

        .t-input-number__decrease,
        .t-input-number__increase {
          display: none;
        }
      }
    }

    .col-qty-input--invalid {
      :deep(.t-input-number .t-input__inner) {
        border-color: #f59e0b;
        background: #fffbeb;
      }
    }

    .col-unit {
      color: #64748b;
      white-space: nowrap;
      overflow: visible;
      text-align: center;
    }

    .col-price {
      text-align: right;

      .col-price-missing {
        color: #94a3b8;
        font-size: 11px;
      }
    }

    .col-price-edit {
      display: flex;
      align-items: center;
      gap: 2px;
      justify-content: flex-end;

      .t-input-number {
        width: 80px;
      }

      :deep(.t-input-number .t-input__inner) {
        text-align: right;
        font-size: 12px;
      }

      .col-price-unit {
        font-size: 11px;
        color: #94a3b8;
        flex-shrink: 0;
      }
    }

    .col-adjust {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;

      .col-adjust-badge {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 10px;
        line-height: 1.4;
        padding: 2px 6px;
        border-radius: 6px;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        color: #b45309;
        font-weight: 700;
        flex-shrink: 0;
        cursor: help;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
          background: linear-gradient(135deg, #fde68a, #fcd34d);
          transform: scale(1.05);
        }
      }

      .col-adjust-badge--qty {
        background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        color: #1d4ed8;

        &:hover {
          background: linear-gradient(135deg, #bfdbfe, #93c5fd);
        }
      }

      .col-restore-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 5px;
        border: 1px solid #e2e8f0;
        background: #fff;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        padding: 0;

        &:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #059669;
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.95);
        }

        &--flash {
          animation: restore-flash 0.5s ease;
        }
      }
    }

    .col-subtotal {
      text-align: right;
      font-weight: 600;
      font-variant-numeric: tabular-nums;

      &--missing {
        color: #94a3b8;
      }
    }

    .col-status {
      text-align: right;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
  }
}

.quick-add-material-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1px solid #f59e0b;
  background: #fffbeb;
  color: #d97706;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: #fef3c7;
    border-color: #d97706;
    transform: scale(1.15);
    box-shadow: 0 2px 6px rgba(245, 158, 11, 0.25);
  }

  &:active {
    transform: scale(0.95);
  }
}

.remove-material-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1px solid #e2e8f0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #ef4444;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.materials-add-row {
  padding: 10px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);

  .add-material-inline-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 8px;
    background: transparent;
    color: #10B981;
    font-size: 12px;
    font-weight: 500;
    border: 1px dashed #10B981;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: #ecfdf5;
    }
  }
}

.field-help {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

@keyframes restore-flash {
  0% {
    background: #d1fae5;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }

  50% {
    background: #a7f3d0;
    box-shadow: 0 0 8px 2px rgba(16, 185, 129, 0.3);
  }

  100% {
    background: #fff;
    box-shadow: none;
  }
}

@keyframes row-restore-flash {
  0% {
    background: #d1fae5;
  }

  30% {
    background: #a7f3d0;
  }

  100% {
    background: transparent;
  }
}

.reparse-model-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 36px;
  padding: 2px 0;

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
    background: $border-color-light;

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
    color: #334155;
    font-weight: 500;
    line-height: 1.4;
    white-space: nowrap;
  }

  .reparse-model-check {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-left: 4px;
    color: $emerald-500;
  }
}

.form-section {
  margin-top: 24px;

  .form-card {
    border-radius: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 28px;
    box-shadow: $shadow-elevation-1;

    .form-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;

      .form-card-title {
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .form-close-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        transition: all $transition-fast;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #fef2f2;
          color: #ef4444;
        }
      }
    }
  }
}

.inline-error {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

.input-error {
  :deep(.t-input) {
    border-color: #ef4444 !important;
  }

  :deep(.t-input-number) {
    border-color: #ef4444 !important;
  }
}

.materials-form-list {
  width: 100%;

  .material-form-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 8px 10px;
    background: #fff;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    transition: border-color $transition-fast;

    &--error {
      border-color: #fecaca;
      background: #fef2f2;
    }
  }

  .material-remove-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    transition: all $transition-fast;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: #fef2f2;
      color: #ef4444;
    }
  }

  .add-material-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 8px;
    background: transparent;
    color: #10B981;
    font-size: 13px;
    font-weight: 500;
    border: 1px dashed #10B981;
    cursor: pointer;
    transition: all $transition-fast;
    margin-top: 4px;

    &:hover {
      background: #ecfdf5;
    }
  }
}

.quick-create-salesman {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #10B981;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover {
    background: #ecfdf5;
  }
}

.form-submit-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.submit-success-section {
  margin-top: 24px;

  .success-card {
    border-radius: 16px;
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border: 1px solid #a7f3d0;
    padding: 40px 32px;
    text-align: center;

    .success-icon {
      margin-bottom: 16px;
    }

    .success-title {
      font-size: 20px;
      font-weight: 700;
      color: #065f46;
      margin: 0 0 8px;
    }

    .success-desc {
      font-size: 14px;
      color: #047857;
      margin: 0 0 24px;
    }
  }
}

.add-formula-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all $transition-normal;
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
  }
}

.success-file-info {
  margin-top: 16px;
  padding: 12px 16px;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 12px;

  .sfi-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;

    .sfi-title {
      font-size: 12px;
      font-weight: 700;
      color: #059669;
    }
  }

  .sfi-body {
    display: flex;
    align-items: center;
    gap: 8px;

    .sfi-name {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sfi-size {
      font-size: 11px;
      color: #94a3b8;
    }
  }
}

.success-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  justify-content: center;
}

.view-file-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 12px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all $transition-normal;
  white-space: nowrap;

  &:hover {
    border-color: #10b981;
    color: #059669;
    background: #ecfdf5;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
  }
}

@media (max-width: 900px) {
  .ai-panel {
    padding: 20px;

    .ai-body .analysis-result .result-two-col {
      flex-direction: column;

      .result-left,
      .result-right {
        width: 100%;
      }
    }
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
    padding: 7px 12px !important;
    min-height: 38px;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;

    &:hover {
      background-color: #f1f5f9 !important;
    }

    &.t-dropdown__item--active {
      color: #059669 !important;
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
      border-radius: 5px !important;
      overflow: hidden !important;
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #f1f5f9 !important;

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
      color: #334155 !important;
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
      color: #10b981 !important;
    }
  }
}
</style>
