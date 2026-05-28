<template>
  <div class="ai-dashboard" :aria-busy="isLoading" role="main" aria-label="AI 助手工作台">
    <!-- Phase 5: 全局错误提示 -->
    <Transition name="error-fade">
      <div v-if="globalError" class="global-error-toast" role="alert" aria-live="assertive">
        <t-icon name="error-circle" size="20px" />
        <span>{{ globalError }}</span>
        <button @click="globalError = null" class="error-close-btn" aria-label="关闭错误提示">×</button>
      </div>
    </Transition>

    <!-- 操作反馈提示 -->
    <Transition name="error-fade">
      <div v-if="toastVisible" class="action-toast" role="status" aria-live="polite">
        <t-icon name="check-circle" size="16px" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- ═══ 三栏布局容器 ═══ -->
    <div class="dashboard-layout">

      <!-- ═══ 中间主区：区域3 - AI对话区（核心） ═══ -->
      <main class="layout-main">
        <section class="ai-chat-section">
          <div class="chat-container">
            <!-- AI 对话 Tab 内容 -->
            <template v-if="activeTab === 'chat'">
              <!-- 历史会话侧边栏 + 聊天内容 并排区域 -->
              <div class="chat-body-row">
                <!-- 历史会话侧边栏 -->
                <aside class="history-sidebar" :class="{ collapsed: !showHistory }">
                  <div class="history-sidebar-inner">
                    <div class="history-header">
                      <button class="action-circle-btn" @click="toggleHistory" :class="{ active: showHistory }"
                        title="历史记录">
                        <t-icon name="history" size="18px" />
                      </button>
                      <h4 v-if="showHistory">历史会话</h4>
                      <button v-if="showHistory" @click="showRoleConfigDialog = true" class="role-config-btn"
                        title="身份设置">
                        <t-icon name="user-circle" size="16px" />
                      </button>
                      <button v-if="showHistory" @click="showHistory = false" class="close-btn">×</button>
                    </div>
                    <button v-if="showHistory" class="new-session-btn" @click="createNewSession" title="新建对话">
                      <t-icon name="add" size="16px" />
                      <span>新建对话</span>
                    </button>
                    <div v-if="showHistory" class="history-list">
                      <div v-for="session in sessions" :key="session.id" class="history-item"
                        :class="{ active: conversationId === session.id }" @click="switchToSession(session.id)">
                        <div class="session-info">
                          <span class="session-title">{{ session.title || '未命名会话' }}</span>
                          <span class="session-time">{{ formatRelativeTime(session.updatedAt) }}</span>
                        </div>
                        <button class="session-delete-btn" @click="deleteSessionFromHistory(session.id, $event)"
                          title="删除会话">
                          <t-icon name="delete" size="12px" />
                        </button>
                      </div>
                      <div v-if="sessions.length === 0" class="empty-sessions">
                        暂无历史会话
                      </div>
                    </div>
                  </div>
                </aside>
                <!-- 聊天主区域（消息 + 输入框，整体随侧边栏右移） -->
                <div class="chat-main">
                  <!-- 消息区域 -->
                  <div class="messages-wrapper" ref="messagesContainer" @scroll="handleMessagesScroll">
                    <!-- 欢迎消息 -->
                    <div v-if="messages.length === 0" class="welcome-message">
                      <div class="welcome-header">
                        <div class="welcome-logo">
                          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
                            <path d="M14 22L10 4L26 16Z" fill="var(--color-primary-lighter)" />
                            <path d="M46 22L50 4L34 16Z" fill="var(--color-primary-lighter)" />
                            <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                            <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                            <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                            <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                            <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
                            <path d="M27 38Q30 42 33 38" stroke="var(--color-primary-dark)" stroke-width="1" fill="none"
                              stroke-linecap="round" />
                            <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                            <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                          </svg>
                        </div>
                        <h3>你好！我是TingStudio AI助手</h3>
                      </div>
                      <p>我可以帮你：</p>
                      <ul class="welcome-features">
                        <li @click="handleQuickQuestion('分析销售数据和趋势')">分析销售数据和趋势</li>
                        <li @click="handleQuickQuestion('优化配方和降低成本')">优化配方和降低成本</li>
                        <li @click="handleQuickQuestion('管理原料库存和采购')">管理原料库存和采购</li>
                        <li @click="handleQuickQuestion('生成各类业务报告')">生成各类业务报告</li>
                      </ul>
                      <p class="welcome-hint">试试问我一个问题吧！</p>
                    </div>

                    <!-- 消息列表 -->
                    <div v-for="msg in messages" :key="msg.id" class="message-item" :class="[`message-${msg.role}`]">
                      <!-- 用户消息 -->
                      <template v-if="msg.role === 'user'">
                        <div class="user-avatar">
                          <img loading="lazy" class="user-avatar-img"
                            :src="authStore.user?.avatar || '/avatar-default.jpg'"
                            :alt="authStore.user?.username || '用户'" />
                        </div>
                        <div class="user-message-content">
                          <div class="user-bubble">{{ msg.content }}</div>
                          <div class="user-message-footer">
                            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                          </div>
                          <div class="message-action-icons">
                            <button class="msg-icon-btn" @click="copyMessageContent(msg.content)" title="复制">
                              <t-icon name="file-copy" size="14px" />
                            </button>
                            <button class="msg-icon-btn" @click="deleteMessage(msg.id)" title="删除">
                              <t-icon name="delete" size="14px" />
                            </button>
                          </div>
                        </div>
                      </template>

                      <!-- AI消息 -->
                      <template v-else-if="msg.role === 'assistant'">
                        <div class="avatar-logo">
                          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
                            <path d="M14 22L10 4L26 16Z" fill="var(--color-primary-lighter)" />
                            <path d="M46 22L50 4L34 16Z" fill="var(--color-primary-lighter)" />
                            <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                            <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                            <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                            <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                            <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
                            <path d="M27 38Q30 42 33 38" stroke="var(--color-primary-dark)" stroke-width="1" fill="none"
                              stroke-linecap="round" />
                            <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                            <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                          </svg>
                        </div>
                        <div class="assistant-message-content">
                          <div class="assistant-bubble">
                            <div class="markdown-content" v-html="renderMarkdown(msg.content)"
                              @click="handleMarkdownClick"></div>

                            <AgentResultRenderer v-if="msg.toolResultData"
                              :display-type="msg.toolResultData.displayType || 'card'" :data="msg.toolResultData.data"
                              :is-success="msg.toolResultData.success" :tool-name="msg.toolResultData.toolName" />

                            <AgentFormRenderer v-if="msg.formSchema && !msg.formSubmitted" :form-schema="msg.formSchema"
                              @submit="(data) => handleFormSubmit(msg, data)" @cancel="handleFormCancel(msg)" />

                            <div v-if="msg.formSubmitted" class="form-submitted-notice">
                              <t-icon name="check-circle" size="16px" />
                              <span>{{ msg.formSubmitSuccess ? '表单提交成功' : '表单提交失败' }}</span>
                            </div>

                            <div v-if="msg.writeGuidanceLinks?.length" class="write-guidance-links">
                              <div v-for="(gl, idx) in msg.writeGuidanceLinks" :key="idx" class="guidance-link-item">
                                <t-icon name="link" size="14px" />
                                <a :href="gl.navigationLink" @click.prevent="navigateTo(gl.navigationLink)" class="guidance-nav-link">
                                  前往操作 →
                                </a>
                              </div>
                            </div>

                            <div v-if="(msg.actions?.length ?? 0) > 0" class="message-actions">
                              <button v-for="action in msg.actions" :key="action.id" class="action-btn"
                                @click="executeAction(action)">
                                <t-icon v-if="action.icon" :name="action.icon" size="14px" />
                                {{ action.label }}
                              </button>
                            </div>

                            <div class="message-meta"
                              v-if="msg.metadata && (msg.metadata.model || msg.metadata.latency || msg.metadata.tokens || msg.metadata.tokenUsage)">
                              <template v-if="msg.metadata.model">
                                <img :src="getModelLogoUrl(getProviderFromModel(msg.metadata.model))"
                                  :alt="msg.metadata.model" class="meta-model-logo"
                                  @error="(e) => { const img = e.target as HTMLImageElement; img.style.display = 'none'; const fb = img.nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex'; }" />
                                <span class="meta-model-logo-fallback"
                                  :style="{ background: getFallbackColor(getProviderFromModel(msg.metadata.model)), color: '#fff' }"
                                  style="display: none;">{{ getFallbackLetter(getProviderFromModel(msg.metadata.model))
                                  }}</span>
                                <span class="meta-model">{{ msg.metadata.model }}</span>
                              </template>
                              <template v-if="msg.metadata.latency && msg.metadata.latency > 0">
                                <span v-if="msg.metadata.model" class="meta-sep">·</span>
                                <span class="meta-latency">{{ msg.metadata.latency < 1000 ? msg.metadata.latency + 'ms'
                                  : (msg.metadata.latency / 1000).toFixed(1) + 's' }}</span>
                              </template>
                              <template v-if="msg.metadata.tokenUsage && (msg.metadata.tokenUsage as Record<string, unknown>).total_tokens as number > 0">
                                <span class="meta-sep">·</span>
                                <span class="token-usage"
                                  :title="`输入: ${((msg.metadata.tokenUsage as Record<string, unknown>).prompt_tokens as number) || 0} / 输出: ${((msg.metadata.tokenUsage as Record<string, unknown>).completion_tokens as number) || 0}`">Token：{{
                                    (msg.metadata.tokenUsage as Record<string, unknown>).total_tokens }}</span>
                              </template>
                              <template v-else-if="msg.metadata.tokens && msg.metadata.tokens > 0">
                                <span class="meta-sep">·</span>
                                <span class="token-usage">Token：{{ msg.metadata.tokens }}</span>
                              </template>
                            </div>
                          </div>
                          <div class="message-action-icons">
                            <button class="msg-icon-btn" @click="copyMessageContent(msg.content)" title="复制">
                              <t-icon name="file-copy" size="14px" />
                            </button>
                            <button class="msg-icon-btn" @click="retryMessage(msg)" title="重试">
                              <t-icon name="refresh" size="14px" />
                            </button>
                          </div>
                        </div>
                      </template>
                    </div>

                    <!-- 流式输出中的临时消息 -->
                    <div v-if="isLoading && streamingContent" class="message-item message-assistant">
                      <div class="avatar-logo">
                        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
                          <path d="M14 22L10 4L26 16Z" fill="var(--color-primary-lighter)" />
                          <path d="M46 22L50 4L34 16Z" fill="var(--color-primary-lighter)" />
                          <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                          <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                          <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                          <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                          <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
                          <path d="M27 38Q30 42 33 38" stroke="var(--color-primary-dark)" stroke-width="1" fill="none"
                            stroke-linecap="round" />
                          <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                          <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                        </svg>
                      </div>
                      <div class="assistant-bubble typing">
                        <div class="markdown-content" v-html="renderMarkdown(streamingContent)"></div>
                        <span class="cursor-blink">|</span>
                      </div>
                    </div>

                    <!-- 加载指示器 -->
                    <div v-if="isLoading && !streamingContent" class="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                  <!-- 回到底部按钮 -->
                  <Transition name="scroll-btn-fade">
                    <button v-if="showScrollBottom" class="scroll-bottom-btn" @click="scrollToBottomClick" title="回到底部">
                      <t-icon name="arrow-down" size="18px" />
                      <span v-if="isLoading" class="scroll-btn-pulse"></span>
                    </button>
                  </Transition>
                  <!-- 输入框区域 -->
                  <div class="chat-input-bar">
                    <div class="input-wrapper" ref="inputWrapperRef">
                      <!-- 斜杠指令弹出面板 -->
                      <Transition name="command-fade">
                        <div v-if="showCommandPalette" class="command-palette" ref="commandPaletteRef">
                          <div class="command-palette-header">
                            <t-icon name="app" size="14px" />
                            <span>快捷指令</span>
                          </div>
                          <div class="command-category-tabs">
                            <button class="category-tab" :class="{ active: !activeCommandCategory }" @click="setCommandCategory(null)">
                              全部
                            </button>
                            <button v-for="(cat, key) in COMMAND_CATEGORIES" :key="key" class="category-tab"
                              :class="{ active: activeCommandCategory === key }"
                              :style="activeCommandCategory === key ? { color: cat.color, borderColor: cat.color, background: cat.color + '10' } : {}"
                              @click="setCommandCategory(key as string)">
                              <t-icon :name="cat.icon" size="12px" />
                              <span>{{ cat.label }}</span>
                            </button>
                          </div>
                          <div class="command-palette-list">
                            <div v-for="(cmd, idx) in filteredCommands" :key="cmd.id" class="command-item"
                              :class="{ active: activeCommandIndex === idx }" @click="selectCommand(cmd)"
                              @mouseenter="activeCommandIndex = idx">
                              <div class="command-item-icon" :style="{ background: cmd.iconBg }">
                                <t-icon :name="cmd.icon" size="16px" :style="{ color: cmd.iconColor }" />
                              </div>
                              <div class="command-item-info">
                                <span class="command-item-name">/{{ cmd.id }}</span>
                                <span class="command-item-desc">{{ cmd.description }}</span>
                              </div>
                              <span class="command-item-category"
                                :style="{ color: COMMAND_CATEGORIES[cmd.category]?.color, background: COMMAND_CATEGORIES[cmd.category]?.color + '15' }">
                                {{ COMMAND_CATEGORIES[cmd.category]?.label }}
                              </span>
                              <span v-if="cmd.shortcut" class="command-item-shortcut">{{ cmd.shortcut }}</span>
                            </div>
                            <div v-if="filteredCommands.length === 0" class="command-empty">
                              <t-icon name="search" size="16px" />
                              <span>未找到匹配的指令</span>
                            </div>
                          </div>
                        </div>
                      </Transition>
                      <textarea v-model="inputText" placeholder="输入问题或 / 调用指令... (Shift+Enter换行)"
                        @keydown.enter.exact="() => handleSend()" @input="handleInputChange"
                        @keydown="handleInputKeydown" :disabled="isLoading" rows="1" ref="textareaRef"></textarea>
                      <div class="input-actions">
                        <div class="model-selector">
                          <div class="model-dropdown-wrap" ref="modelDropdownRef">
                            <button class="model-dropdown-trigger" @click="toggleModelMenu">
                              <img v-if="currentModelLogo" :src="currentModelLogo" :alt="displayModelName"
                                class="model-trigger-logo" @error="(e: Event) => handleLogoError(e)" />
                              <span v-else class="model-trigger-fallback" :style="{ color: currentModelFallbackColor }">
                                {{ currentModelFallbackLetter }}
                              </span>
                              <span class="model-trigger-name">{{ displayModelName }}</span>
                              <t-icon name="chevron-down" size="14px" />
                            </button>
                            <Transition name="dropdown">
                              <div v-if="showModelMenu" class="model-dropdown-panel">
                                <div v-if="modelsLoading" class="model-dropdown-loading">
                                  <t-icon name="loading" size="16px" class="spin-icon" />
                                  <span>加载模型中...</span>
                                </div>
                                <div v-else-if="modelsLoadError" class="model-dropdown-error">
                                  <t-icon name="error-circle" size="16px" />
                                  <span>{{ modelsLoadError }}</span>
                                  <button class="model-retry-btn" @click="fetchAllModelVersions">重试</button>
                                </div>
                                <template v-else>
                                  <div v-for="m in availableModels" :key="m.value" class="model-dropdown-item"
                                    :class="{ active: currentModelValue === m.value }" @click="selectModel(m)">
                                    <div class="model-item-logo-wrap">
                                      <img :src="m.logo" :alt="m.label" class="model-item-logo"
                                        @error="(e: Event) => handleLogoError(e)" />
                                      <span class="model-item-fallback" :style="{ color: m.fallbackColor }">
                                        {{ m.fallbackLetter }}
                                      </span>
                                    </div>
                                    <span class="model-item-name">{{ m.label }}</span>
                                    <span v-if="currentModelValue === m.value" class="model-item-check">
                                      <t-icon name="check" size="14px" />
                                    </span>
                                  </div>
                                </template>
                              </div>
                            </Transition>
                          </div>
                        </div>
                        <label class="action-circle-btn attach-btn" title="上传图片">
                          <t-icon name="attach" size="18px" />
                          <input type="file" accept="image/*,.pdf,.xlsx" @change="handleFileUpload" hidden />
                        </label>
                        <button class="send-btn" @click="() => handleSend()"
                          :disabled="!inputText.trim() && !selectedFile" :loading="isLoading">
                          <t-icon name="send" size="18px" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </section>
      </main>

      <!-- ═══ 右侧栏：数据卡片 + 快捷操作 ═══ -->
      <aside class="layout-sidebar layout-right">
        <section class="data-overview-cards">
          <TransitionGroup name="card-fade" tag="div" class="cards-grid">
            <div v-for="(card, index) in dataCards" :key="card.id" class="data-card"
              :class="[`card-${card.color}`, { loading: card.loading }]" :style="{ animationDelay: `${index * 0.1}s` }"
              @click="handleCardClick(card)">
              <div class="card-header">
                <t-icon :name="card.icon" size="24px" />
                <span class="card-title">{{ card.title }}</span>
              </div>

              <div class="card-value">
                <template v-if="card.loading">
                  <div class="skeleton-value"></div>
                </template>
                <template v-else>
                  <span class="value-number" :ref="(el: unknown) => { if (el) valueRefs[index] = el as HTMLElement; }">
                    {{ formatNumber(card.value) }}
                  </span>
                </template>
              </div>

              <div class="card-trend" v-if="card.trend && !card.loading">
                <t-icon :name="getTrendIcon(card.trend.direction)" size="14px" />
                <span :class="`trend-${card.trend.direction}`">{{ card.trend.value }}</span>
              </div>

              <div class="card-badge" v-if="card.showBadge && (card.value ?? 0) > 0 && !card.loading">
                {{ card.value ?? 0 }}
              </div>
            </div>
          </TransitionGroup>
        </section>

        <!-- ═══ 快捷操作 ═══ -->
        <section class="quick-actions-row">
          <div class="quick-actions-grid">
            <button v-for="action in quickActions" :key="action.path" class="action-item"
              :class="{ primary: action.primary, 'ai-feature': action.isAIFeature }" @click="handleQuickAction(action)">
              <t-icon :name="action.icon" size="24px" />
              <span class="action-label">{{ action.label }}</span>
              <span v-if="action.badge" class="action-badge">{{ action.badge }}</span>
            </button>
          </div>
        </section>
      </aside>

      <ToolConfirmDialog :show="confirmDialogVisible" :message="confirmMessage" :tool-name="confirmToolName"
        :params="confirmParams" @confirm="handleConfirmAction" @cancel="handleCancelAction" />

      <!-- ═══ 身份设置弹窗 ═══ -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showRoleConfigDialog" class="modal-overlay" @click.self="showRoleConfigDialog = false">
            <div class="modal-container role-config-modal">
              <div class="modal-header">
                <h3>🤖 AI 助手身份设置</h3>
                <button class="close-btn" @click="showRoleConfigDialog = false">×</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label>助手称呼</label>
                  <input v-model="roleConfig.agent_name" type="text" placeholder="例如：小听、配方大师、AI管家" />
                  <span class="form-hint">这是AI助手对自己的称呼</span>
                </div>
                <div class="form-group">
                  <label>对您的称呼</label>
                  <input v-model="roleConfig.user_title" type="text" placeholder="例如：老板、师傅、老师" />
                  <span class="form-hint">AI助手将这样称呼您</span>
                </div>
                <div class="form-group">
                  <label>语气风格</label>
                  <select v-model="roleConfig.tone_style">
                    <option value="professional">专业 · 简洁高效</option>
                    <option value="friendly">亲切 · 温暖活泼</option>
                    <option value="respectful">恭敬 · 礼貌正式</option>
                    <option value="casual">轻松 · 随意自然</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>开场问候语 <span class="optional-tag">可选</span></label>
                  <input v-model="roleConfig.greeting" type="text" placeholder="例如：老板好！今天有什么配方需要处理？" />
                  <span class="form-hint">每次新对话开始时的问候语</span>
                </div>
                <div class="form-group">
                  <label>自定义指令 <span class="optional-tag">可选</span></label>
                  <textarea v-model="roleConfig.custom_instructions" rows="3"
                    placeholder="例如：回答时多用表格展示、优先推荐低成本方案等"></textarea>
                  <span class="form-hint">额外的行为指令，AI助手会遵循这些要求</span>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn-cancel" @click="showRoleConfigDialog = false">取消</button>
                <button class="btn-confirm" @click="saveRoleConfig" :disabled="roleConfigSaving">
                  {{ roleConfigSaving ? '保存中...' : '保存设置' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- ═══ 智能填单模态框 ═══ -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showSmartFormModal" class="modal-overlay" @click.self="showSmartFormModal = false">
            <div class="modal-container">
              <div class="modal-header">
                <h3>📝 智能填单</h3>
                <button @click="showSmartFormModal = false" class="modal-close-btn">×</button>
              </div>
              <div class="modal-body">
                <FormulaParseTab @activity-add="addActivity" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- ═══ 智能导入模态框 ═══ -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showSmartImportModal" class="modal-overlay" @click.self="showSmartImportModal = false">
            <div class="modal-container">
              <div class="modal-header">
                <h3>📥 智能导入</h3>
                <button @click="showSmartImportModal = false" class="modal-close-btn">×</button>
              </div>
              <div class="modal-body">
                <MaterialImportTab @activity-add="addActivity" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { marked } from 'marked';
import http from '@/api/http';
import FormulaParseTab from './tabs/FormulaParseTab.vue';
import MaterialImportTab from './tabs/MaterialImportTab.vue';
import ToolConfirmDialog from '@/components/ToolConfirmDialog.vue';
import AgentResultRenderer from '@/components/AgentResultRenderer.vue';
import AgentFormRenderer, { type FormSchema } from '@/components/AgentFormRenderer.vue';
import { useAuthStore } from '@/stores/auth';
import { useAgentStore } from '@/stores/agent';
import { useModelStore } from '@/stores/model';
import { useAiStore } from '@/stores/ai';
import { agentApi } from '@/api/agent';
import type { ModelItem } from '@/api/model';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const agentStore = useAgentStore();
const modelStore = useModelStore();
const aiStore = useAiStore();

interface ToolCallItem {
  name: string;
  [key: string]: unknown;
}

interface IntentData {
  intent?: string;
  [key: string]: unknown;
}

interface PendingConfirmData {
  toolName: string;
  params: Record<string, unknown>;
  message: string;
}

interface ToolResultData {
  displayType: string;
  toolName: string;
  data: unknown;
  success: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  metadata?: {
    model: string;
    tokens: number;
    latency: number;
    intent?: string;
    tokenUsage?: Record<string, unknown> | null;
  };
  actions?: ActionItem[];
  toolResult?: ToolCallItem[];
  toolResultData?: ToolResultData | null;
  pendingConfirm?: PendingConfirmData | null;
  formSchema?: FormSchema | null;
  formSubmitted?: boolean;
  formSubmitSuccess?: boolean;
  writeGuidanceLinks?: Array<{ message: string; navigationLink: string }>;
}

interface RecentVisitItem {
  path: string;
  label: string;
  icon?: string;
  timestamp?: string;
}

interface PendingTaskItem {
  id: string;
  title: string;
  type: string;
  priority?: string;
  createdAt?: string;
}

interface QuickActionItem {
  label: string;
  icon: string;
  path: string;
  primary?: boolean;
  isAIFeature?: boolean;
  badge?: string;
  action?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface DashboardStatsResponse {
  formulas?: number;
  materials?: number;
  sales?: { revenue: number };
  pendingTasks?: number;
}

const confirmDialogVisible = ref(false);
const confirmMessage = ref('');
const confirmToolName = ref('');
const confirmParams = ref<Record<string, unknown>>({});

const pendingFormSchema = ref<FormSchema | null>(null);
const pendingFormSessionId = ref<string>('');

const toastMessage = ref('');
const toastVisible = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const showActionToast = (message: string) => {
  toastMessage.value = message;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 2000);
};

// ════════════════════════════════════════
// Tab 切换状态
// ════════════════════════════════════════
const activeTab = ref<'chat'>('chat');

// 模态框状态（用于智能填单/导入）
const showSmartFormModal = ref(false);
const showSmartImportModal = ref(false);

// ════════════════════════════════════════
// 状态定义
// ════════════════════════════════════════

// AI俏皮话
const wittyComment = ref('');
const wittyLoading = ref(false);
const FALLBACK_POOL = [
  "又是搬砖的一天，今天也要加油哦 💪",
  "配方调得再好，也别忘了喝水 🥤",
  "据说周五的配方成功率最高，是真的吗？🤔",
  "今天的原料价格波动了吗？快去看看吧 👀",
  "AI提示：连续工作2小时记得站起来活动一下 🏃",
  "周一综合症？不存在的，我们有AI助手呀 😎",
  "库存不足预警比闹钟还准时呢 ⏰",
  "今天的目标：完成3个配方优化任务 🎯"
];

// 数据卡片
interface DataCard {
  id: string;
  title: string;
  icon: string;
  value: number | null;
  trend: { direction: 'up' | 'down' | 'neutral'; value: string; } | null;
  loading: boolean;
  color: string;
  clickPath: string | null;
  showBadge?: boolean;
}

// ════════════════════════════════════════
// Phase 5: 错误处理与性能优化工具
// ════════════════════════════════════════

// 全局错误状态
const globalError = ref<string | null>(null);
const showErrorToast = (message: string) => {
  globalError.value = message;
  console.error('[Dashboard Error]', message);

  // 5秒后自动清除错误
  setTimeout(() => {
    if (globalError.value === message) {
      globalError.value = null;
    }
  }, 5000);
};

// 防抖函数（Phase 5 预留，按需启用）
// const debounce = <T extends (...args: unknown[]) => unknown>(
//   fn: T,
//   delay: number = 300
// ): ((...args: Parameters<T>) => void) => {
//   let timeoutId: ReturnType<typeof setTimeout>
//   return (...args: Parameters<T>) => {
//     clearTimeout(timeoutId)
//     timeoutId = setTimeout(() => fn(...args), delay)
//   }
// }

// 性能监控
const performanceMetrics = ref({
  loadTime: 0,
  apiCalls: 0,
  errors: 0,
  lastUpdated: null as Date | null
});

const recordPerformance = (metric: keyof typeof performanceMetrics.value, value?: number | Date) => {
  if (metric === 'apiCalls' || metric === 'errors') {
    performanceMetrics.value[metric]++;
  } else if (metric === 'lastUpdated') {
    performanceMetrics.value[metric] = new Date();
  } else if (metric === 'loadTime' && typeof value === 'number') {
    performanceMetrics.value[metric] = value;
  }
};

// 使用防抖优化的搜索/输入处理（Phase 5 预留，按需启用）
// const debouncedHandleSend: ((...args: unknown[]) => void) | null = null

const dataCards = ref<DataCard[]>([
  {
    id: 'formulas',
    title: '配方总数',
    icon: 'edit',
    value: null,
    trend: null,
    loading: true,
    color: 'emerald',
    clickPath: '/formulas'
  },
  {
    id: 'materials',
    title: '原料种类',
    icon: 'chart-bar',
    value: null,
    trend: null,
    loading: true,
    color: 'blue',
    clickPath: '/materials'
  },
  {
    id: 'sales',
    title: '本月销量',
    icon: 'chart',
    value: null,
    trend: null,
    loading: true,
    color: 'purple',
    clickPath: '/sales'
  },
  {
    id: 'pending',
    title: '待处理任务',
    icon: 'time',
    value: null,
    trend: null,
    loading: true,
    color: 'amber',
    clickPath: null,
    showBadge: true
  }
]);

const valueRefs = ref<HTMLElement[]>([]);

// 快捷操作
const quickActions = [
  { label: '+ 新建配方', icon: 'add-circle', path: '/formulas/new', primary: true },
  { label: '+ 添加原料', icon: 'add', path: '/materials/new' },
  { label: '生成周报', icon: 'file-icon', path: '/reports/generate?type=weekly' },
  { label: '导出数据', icon: 'download', path: '/system/config' },
  { label: '📝 智能填单', icon: 'edit', path: 'smart-form', isAIFeature: true, badge: 'AI', action: 'tab' },
  { label: '📥 智能导入', icon: 'upload', path: 'smart-import', isAIFeature: true, badge: 'AI', action: 'tab' }
];

// AI推荐
interface Suggestion {
  text: string;
  category: string;
}

const STATIC_SUGGESTIONS: Suggestion[] = [
  { text: '帮我分析本月销量趋势 📈', category: 'analytics' },
  { text: '检查哪些原料库存不足 🧪', category: 'analytics' },
  { text: '生成本周业务周报 📝', category: 'reporting' },
  { text: '对比上月配方使用情况 📊', category: 'analytics' },
  { text: '预测下季度原料需求 🔮', category: 'optimization' },
  { text: '优化配方的成本结构 💰', category: 'optimization' },
  { text: '创建新的实验配方 🧪', category: 'creation' },
  { text: '导出本季度销售报表 📄', category: 'reporting' }
];

const displayedSuggestions = ref<Suggestion[]>([]);

// AI对话状态
const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const isLoading = ref(false);
const streamingContent = ref('');
const CONVERSATION_ID_KEY = 'tingstudio_agent_conversation_id';

interface SessionDisplay {
  id: string;
  title: string;
  updatedAt: string;
}

const conversationId = ref<string | null>(null);
const showHistory = ref(false);
const sessions = ref<SessionDisplay[]>([]);
const currentProvider = computed({
  get: () => aiStore.selectedModel || 'deepseek',
  set: (val: string) => { aiStore.selectedModel = val; },
});
const currentModelVersion = computed({
  get: () => aiStore.selectedVersion || 'deepseek-v4-flash',
  set: (val: string) => { aiStore.selectedVersion = val; },
});
const selectedFile = ref<File | null>(null);
const showModelMenu = ref(false);
const modelDropdownRef = ref<HTMLElement | null>(null);
const modelsLoading = ref(true);
const modelsLoadError = ref<string | null>(null);

const showRoleConfigDialog = ref(false);
const roleConfig = ref({
  agent_name: '小听',
  user_title: '老板',
  greeting: '',
  tone_style: 'professional',
  custom_instructions: '',
});
const roleConfigSaving = ref(false);

interface ModelVersionItem {
  value: string;
  label: string;
  provider: string;
  providerName: string;
  logo: string;
  fallbackLetter: string;
  fallbackColor: string;
}

const allModelVersions = ref<ModelVersionItem[]>([]);

const MODEL_LOGO_MAP: Record<string, string> = {
  openai: 'openai', gpt: 'openai', chatgpt: 'openai',
  anthropic: 'claude', claude: 'claude',
  google: 'google', gemini: 'google',
  deepseek: 'deepseek',
  qwen: 'qwen', tongyi: 'qwen', dashscope: 'qwen',
  zhipu: 'zhipu', chatglm: 'zhipu', glm: 'zhipu',
  baidu: 'baidu', wenxin: 'baidu',
  doubao: 'bytedance', bytedance: 'bytedance',
  moonshot: 'moonshot', kimi: 'moonshot',
  minimax: 'minimax',
  hunyuan: 'tencent', tencent: 'tencent',
};

const FALLBACK_ICONS: Record<string, { letter: string; color: string; }> = {
  openai: { letter: 'O', color: '#10a37f' },
  claude: { letter: 'C', color: '#d97757' },
  google: { letter: 'G', color: '#4285f4' },
  deepseek: { letter: 'D', color: '#4b6bfb' },
  qwen: { letter: 'Q', color: '#6366f1' },
  dashscope: { letter: 'Q', color: '#6366f1' },
  zhipu: { letter: 'Z', color: '#4268fa' },
  baidu: { letter: 'B', color: '#2932e1' },
  bytedance: { letter: 'D', color: '#25f4ee' },
  moonshot: { letter: 'M', color: '#000' },
  minimax: { letter: 'M', color: '#615ced' },
  tencent: { letter: 'T', color: '#0052d9' },
};

const getModelSlug = (provider: string): string => {
  const p = (provider || '').toLowerCase();
  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (p.includes(key)) return slug;
  }
  return 'openai';
};

const getModelLogoUrl = (provider: string): string => {
  const slug = getModelSlug(provider);
  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
};

const getProviderFromModel = (modelName: string): string => {
  const m = (modelName || '').toLowerCase();
  if (m.includes('deepseek')) return 'deepseek';
  if (m.includes('qwen') || m.includes('tongyi') || m.includes('dashscope') || m.includes('通义')) return 'dashscope';
  if (m.includes('glm') || m.includes('zhipu') || m.includes('智谱') || m.includes('chatglm')) return 'zhipu';
  if (m.includes('claude') || m.includes('anthropic')) return 'claude';
  if (m.includes('gpt') || m.includes('openai') || m.includes('chatgpt')) return 'openai';
  if (m.includes('gemini') || m.includes('google')) return 'google';
  if (m.includes('baidu') || m.includes('wenxin') || m.includes('文心')) return 'baidu';
  if (m.includes('kimi') || m.includes('moonshot')) return 'moonshot';
  if (m.includes('douyin') || m.includes('doubao') || m.includes('豆包')) return 'bytedance';
  if (m.includes('hunyuan') || m.includes('tencent')) return 'tencent';
  if (m.includes('minimax')) return 'minimax';
  return 'openai';
};

const getFallbackLetter = (provider: string): string => {
  const p = (provider || '').toLowerCase();
  for (const [key, val] of Object.entries(FALLBACK_ICONS)) {
    if (p.includes(key)) return val.letter;
  }
  return 'AI';
};

const getFallbackColor = (provider: string): string => {
  const p = (provider || '').toLowerCase();
  for (const [key, val] of Object.entries(FALLBACK_ICONS)) {
    if (p.includes(key)) return val.color;
  }
  return 'var(--color-text-secondary)';
};

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (!img || !img.parentElement) return;
  img.style.display = 'none';
  const fallback = img.parentElement.querySelector('.model-item-fallback, .model-trigger-fallback');
  if (fallback) (fallback as HTMLElement).style.display = 'flex';
};

const currentModelValue = computed(() => currentModelVersion.value);

const displayModelName = computed(() => {
  const item = allModelVersions.value.find(m => m.value === currentModelVersion.value);
  if (item) return item.label;
  const storeModel = modelStore.models.find((m: ModelItem) => m.provider === currentProvider.value);
  return storeModel?.name || currentProvider.value;
});

const currentModelLogo = computed(() => getModelLogoUrl(currentProvider.value));

const currentModelFallbackLetter = computed(() => getFallbackLetter(currentProvider.value));

const currentModelFallbackColor = computed(() => getFallbackColor(currentProvider.value));

const availableModels = computed(() => {
  if (allModelVersions.value.length > 0) {
    return allModelVersions.value;
  }
  const storeModels = modelStore.models;
  if (storeModels && storeModels.length > 0) {
    return storeModels
      .filter((m: ModelItem) => m.apiKeyConfigured)
      .map((m: ModelItem) => {
        const provider = m.provider || '';
        return {
          value: m.model || provider,
          label: m.name || provider,
          provider,
          providerName: m.name || provider,
          logo: getModelLogoUrl(provider),
          fallbackLetter: getFallbackLetter(provider),
          fallbackColor: getFallbackColor(provider),
        };
      });
  }
  return [
    { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', provider: 'deepseek', providerName: 'DeepSeek', logo: getModelLogoUrl('deepseek'), fallbackLetter: 'D', fallbackColor: '#4b6bfb' },
    { value: 'qwen-plus', label: 'Qwen Plus', provider: 'dashscope', providerName: '通义千问', logo: getModelLogoUrl('dashscope'), fallbackLetter: 'Q', fallbackColor: '#6366f1' },
    { value: 'glm-4-flash', label: 'GLM-4 Flash', provider: 'zhipu', providerName: '智谱GLM', logo: getModelLogoUrl('zhipu'), fallbackLetter: 'Z', fallbackColor: '#4268fa' },
  ];
});

const fetchAllModelVersions = async () => {
  modelsLoading.value = true;
  modelsLoadError.value = null;
  try {
    const configuredProviders = modelStore.models
      .filter((m: ModelItem) => m.apiKeyConfigured)
      .map((m: ModelItem) => m.provider);

    const allVersions: ModelVersionItem[] = [];
    const { modelApi } = await import('@/api/model');

    for (const provider of configuredProviders) {
      try {
        const res = await modelApi.getVersionsByProvider(provider);
        const storeModel = modelStore.models.find((m: ModelItem) => m.provider === provider);
        const providerName = storeModel?.name || provider;

        if (res.versions && res.versions.length > 0) {
          for (const v of res.versions) {
            allVersions.push({
              value: v.value,
              label: v.label,
              provider,
              providerName,
              logo: getModelLogoUrl(provider),
              fallbackLetter: getFallbackLetter(provider),
              fallbackColor: getFallbackColor(provider),
            });
          }
        } else {
          allVersions.push({
            value: storeModel?.model || provider,
            label: storeModel?.name || provider,
            provider,
            providerName,
            logo: getModelLogoUrl(provider),
            fallbackLetter: getFallbackLetter(provider),
            fallbackColor: getFallbackColor(provider),
          });
        }
      } catch {
        const storeModel = modelStore.models.find((m: ModelItem) => m.provider === provider);
        const providerName = storeModel?.name || provider;
        allVersions.push({
          value: storeModel?.model || provider,
          label: storeModel?.name || provider,
          provider,
          providerName,
          logo: getModelLogoUrl(provider),
          fallbackLetter: getFallbackLetter(provider),
          fallbackColor: getFallbackColor(provider),
        });
      }
    }

    allModelVersions.value = allVersions;

    const currentExists = allVersions.some(v => v.value === currentModelVersion.value);
    if (!currentExists && allVersions.length > 0) {
      const defaultItem = allVersions.find(v => v.provider === (aiStore.selectedModel || 'deepseek')) || allVersions[0];
      currentProvider.value = defaultItem.provider;
      currentModelVersion.value = defaultItem.value;
    }
  } catch (e: unknown) {
    modelsLoadError.value = '加载模型列表失败';
    console.error('[AiWorkspace] fetchAllModelVersions failed:', e);
  } finally {
    modelsLoading.value = false;
  }
};

const toggleModelMenu = () => {
  showModelMenu.value = !showModelMenu.value;
};

const selectModel = async (m: ModelVersionItem) => {
  currentProvider.value = m.provider;
  currentModelVersion.value = m.value;
  showModelMenu.value = false;
  try {
    await aiStore.loadModelVersions(m.provider);
  } catch {
    // ignore model version load failure
  }
};

const copyMessageContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    showActionToast('内容已复制');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showActionToast('内容已复制');
  }
};

const retryMessage = (msg: ChatMessage) => {
  const msgIndex = messages.value.indexOf(msg);
  let retryContent = '';
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      retryContent = messages.value[i].content;
      break;
    }
  }
  if (!retryContent) return;
  showActionToast('正在重新请求...');
  inputText.value = retryContent;
  nextTick(() => {
    handleSend();
  });
};

const deleteMessage = (msgId: string) => {
  const index = messages.value.findIndex((m: ChatMessage) => m.id === msgId);
  if (index !== -1) {
    messages.value.splice(index, 1);
    showActionToast('消息已删除');
  }
};

// ════════════════════════════════════════
// 斜杠指令系统
// ════════════════════════════════════════
interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  shortcut?: string;
  prefix: string;
  keywords: string[];
  category: 'formula' | 'material' | 'salesperson' | 'analytics' | 'report';
}

const COMMAND_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  formula: { label: '配方查询', icon: 'edit', color: 'var(--color-primary)' },
  material: { label: '原料查询', icon: 'chart-bar', color: '#3B82F6' },
  salesperson: { label: '业务员查询', icon: 'user', color: '#8B5CF6' },
  analytics: { label: '数据分析', icon: 'chart', color: '#EC4899' },
  report: { label: '报表报告', icon: 'file-icon', color: 'var(--color-warning)' },
};

const activeCommandCategory = ref<string | null>(null);

const commandRegistry = ref<SlashCommand[]>([
  {
    id: '查询配方',
    label: '查询配方',
    description: '按名称、编号或条件搜索配方',
    icon: 'search',
    iconBg: '#ecfdf5',
    iconColor: 'var(--color-primary)',
    prefix: '请帮我查询配方，',
    keywords: ['配方', '查询', '搜索', '查找', 'formula', 'query', 'search'],
    category: 'formula',
  },
  {
    id: '配方详情',
    label: '配方详情',
    description: '查看指定配方的详细信息、原料组成和用量',
    icon: 'file-icon',
    iconBg: 'var(--color-primary-bg)',
    iconColor: 'var(--color-primary-dark)',
    prefix: '请帮我查看配方详情，',
    keywords: ['配方', '详情', '信息', '组成', '用量', 'formula', 'detail'],
    category: 'formula',
  },
  {
    id: '配方对比',
    label: '配方对比',
    description: '对比多个配方的原料、成本和营养成分差异',
    icon: 'swap',
    iconBg: 'var(--color-primary-lightest)',
    iconColor: 'var(--color-primary-deep)',
    prefix: '请帮我对比配方，',
    keywords: ['配方', '对比', '比较', '差异', 'formula', 'compare', 'diff'],
    category: 'formula',
  },
  {
    id: '配方成本分析',
    label: '配方成本分析',
    description: '分析配方的原料成本构成和占比',
    icon: 'chart-bar',
    iconBg: 'var(--color-primary-lighter)',
    iconColor: '#065f46',
    prefix: '请帮我分析配方成本，',
    keywords: ['配方', '成本', '分析', '费用', 'formula', 'cost', 'analysis'],
    category: 'formula',
  },
  {
    id: '查询原料',
    label: '查询原料',
    description: '按名称、编码或类型搜索原料信息',
    icon: 'search',
    iconBg: '#eff6ff',
    iconColor: '#3B82F6',
    prefix: '请帮我查询原料，',
    keywords: ['原料', '查询', '搜索', '查找', 'material', 'query', 'search'],
    category: 'material',
  },
  {
    id: '原料详情',
    label: '原料详情',
    description: '查看指定原料的详细属性、价格和供应商',
    icon: 'file-icon',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    prefix: '请帮我查看原料详情，',
    keywords: ['原料', '详情', '信息', '属性', 'material', 'detail'],
    category: 'material',
  },
  {
    id: '库存查询',
    label: '库存查询',
    description: '查看原料库存状态、库存量及预警信息',
    icon: 'warehouse',
    iconBg: '#bfdbfe',
    iconColor: '#1d4ed8',
    prefix: '请帮我查询库存情况，',
    keywords: ['库存', '查询', '预警', '不足', 'inventory', 'stock'],
    category: 'material',
  },
  {
    id: '原料价格趋势',
    label: '原料价格趋势',
    description: '查看原料价格的历史变化和趋势预测',
    icon: 'chart-line',
    iconBg: '#93c5fd',
    iconColor: '#1e40af',
    prefix: '请帮我查看原料价格趋势，',
    keywords: ['原料', '价格', '趋势', '波动', 'material', 'price', 'trend'],
    category: 'material',
  },
  {
    id: '查询业务员',
    label: '查询业务员',
    description: '按姓名、工号或区域搜索业务员信息',
    icon: 'search',
    iconBg: '#f3e8ff',
    iconColor: '#8B5CF6',
    prefix: '请帮我查询业务员，',
    keywords: ['业务员', '查询', '搜索', '查找', 'salesman', 'query', 'search'],
    category: 'salesperson',
  },
  {
    id: '业务员详情',
    label: '业务员详情',
    description: '查看业务员的详细信息、负责区域和业绩',
    icon: 'user',
    iconBg: '#e9d5ff',
    iconColor: '#7c3aed',
    prefix: '请帮我查看业务员详情，',
    keywords: ['业务员', '详情', '信息', '业绩', 'salesman', 'detail'],
    category: 'salesperson',
  },
  {
    id: '业务员业绩',
    label: '业务员业绩',
    description: '查看业务员的销售业绩排名和完成率',
    icon: 'chart',
    iconBg: '#c4b5fd',
    iconColor: '#6d28d9',
    prefix: '请帮我查看业务员业绩，',
    keywords: ['业务员', '业绩', '排名', '完成率', 'salesman', 'performance'],
    category: 'salesperson',
  },
  {
    id: '销量分析',
    label: '销量分析',
    description: '分析销售数据、趋势和同比环比变化',
    icon: 'chart',
    iconBg: '#fce7f3',
    iconColor: '#EC4899',
    prefix: '请帮我分析销量数据，',
    keywords: ['销量', '销售', '趋势', '分析', '同比', '环比', 'sales', 'trend', 'analysis'],
    category: 'analytics',
  },
  {
    id: '数据概览',
    label: '数据概览',
    description: '查看关键业务指标和整体运营概况',
    icon: 'dashboard',
    iconBg: '#fbcfe8',
    iconColor: '#db2777',
    prefix: '请帮我查看数据概览，',
    keywords: ['概览', '指标', '概况', '总览', 'dashboard', 'overview', 'kpi'],
    category: 'analytics',
  },
  {
    id: '配方用量统计',
    label: '配方用量统计',
    description: '统计各配方的使用频次和原料消耗量',
    icon: 'chart-pie',
    iconBg: '#f9a8d4',
    iconColor: '#be185d',
    prefix: '请帮我统计配方用量，',
    keywords: ['配方', '用量', '统计', '频次', '消耗', 'formula', 'usage', 'stats'],
    category: 'analytics',
  },
  {
    id: '成本趋势分析',
    label: '成本趋势分析',
    description: '分析配方成本的变化趋势和影响因素',
    icon: 'chart-line',
    iconBg: '#fecdd3',
    iconColor: '#9f1239',
    prefix: '请帮我分析成本趋势，',
    keywords: ['成本', '趋势', '分析', '变化', 'cost', 'trend'],
    category: 'analytics',
  },
  {
    id: '查询月报',
    label: '查询月报',
    description: '获取月度统计报告和关键指标汇总',
    icon: 'file-icon',
    iconBg: '#fef3c7',
    iconColor: 'var(--color-warning)',
    prefix: '请帮我查看本月月报，',
    keywords: ['月报', '报告', '统计', '月度', 'report', 'monthly'],
    category: 'report',
  },
  {
    id: '查询周报',
    label: '查询周报',
    description: '获取周度统计报告和环比变化',
    icon: 'file-icon',
    iconBg: '#fde68a',
    iconColor: '#d97706',
    prefix: '请帮我查看本周周报，',
    keywords: ['周报', '报告', '统计', '周度', 'report', 'weekly'],
    category: 'report',
  },
  {
    id: '查询营养',
    label: '查询营养',
    description: '查询特定食材或配方的营养成分数据',
    icon: 'heart',
    iconBg: '#fff7ed',
    iconColor: '#EA580C',
    prefix: '请帮我查询营养成分，',
    keywords: ['营养', '查询', '成分', '含量', 'nutrition', 'query'],
    category: 'report',
  },
]);

const registerCommand = (cmd: SlashCommand) => {
  const exists = commandRegistry.value.some(c => c.id === cmd.id);
  if (!exists) {
    commandRegistry.value.push(cmd);
  }
};

const unregisterCommand = (id: string) => {
  const idx = commandRegistry.value.findIndex(c => c.id === id);
  if (idx !== -1) {
    commandRegistry.value.splice(idx, 1);
  }
};

defineExpose({
  registerCommand,
  unregisterCommand,
  commandRegistry,
});

const showCommandPalette = ref(false);
const commandPaletteRef = ref<HTMLElement | null>(null);
const inputWrapperRef = ref<HTMLElement | null>(null);
const activeCommandIndex = ref(0);
const commandQuery = ref('');

const filteredCommands = computed(() => {
  let commands = commandRegistry.value;

  if (activeCommandCategory.value) {
    commands = commands.filter(cmd => cmd.category === activeCommandCategory.value);
  }

  const q = commandQuery.value.toLowerCase().trim();
  if (!q) return commands;

  return commands.filter(cmd => {
    if (cmd.id.toLowerCase().includes(q)) return true;
    if (cmd.label.toLowerCase().includes(q)) return true;
    if (cmd.description.toLowerCase().includes(q)) return true;
    if (cmd.category.toLowerCase().includes(q)) return true;
    return cmd.keywords.some(kw => kw.toLowerCase().includes(q));
  });
});

const WRITE_INTENT_PATTERNS = [
  /创建|新建|添加|录入|新增|增加/i,
  /修改|编辑|更新|调整|变更/i,
  /删除|移除|清除|作废/i,
  /提交|保存|确认|发布/i,
];

const isWriteIntentPrefix = (text: string): boolean => {
  const trimmed = text.trim();
  for (const pattern of WRITE_INTENT_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
};

const WRITE_NAV_MAP: Record<string, { navigationLink: string; message: string }> = {
  '配方': { navigationLink: '/formula', message: '配方管理' },
  '原料': { navigationLink: '/material', message: '原料管理' },
  '业务员': { navigationLink: '/salesman', message: '业务员管理' },
  '销售': { navigationLink: '/salesman', message: '销售管理' },
};

const extractWriteNavigationLinks = (text: string): Array<{ message: string; navigationLink: string }> => {
  const links: Array<{ message: string; navigationLink: string }> = [];
  for (const [keyword, nav] of Object.entries(WRITE_NAV_MAP)) {
    if (text.includes(keyword)) {
      links.push(nav);
    }
  }
  return links;
};

const openCommandPalette = () => {
  showCommandPalette.value = true;
  activeCommandIndex.value = 0;
  commandQuery.value = '';
};

const closeCommandPalette = () => {
  showCommandPalette.value = false;
  commandQuery.value = '';
  activeCommandIndex.value = 0;
};

const selectCommand = (cmd: SlashCommand) => {
  inputText.value = cmd.prefix;
  closeCommandPalette();
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      const len = inputText.value.length;
      textareaRef.value.setSelectionRange(len, len);
    }
  });
};

const setCommandCategory = (cat: string | null) => {
  if (activeCommandCategory.value === cat) {
    activeCommandCategory.value = null;
  } else {
    activeCommandCategory.value = cat;
  }
  activeCommandIndex.value = 0;
};

const handleInputChange = () => {
  const text = inputText.value;
  const cursorPos = textareaRef.value?.selectionStart ?? text.length;
  const textBeforeCursor = text.slice(0, cursorPos);
  const slashMatch = textBeforeCursor.match(/\/([^/\s]*)$/);

  if (slashMatch) {
    commandQuery.value = slashMatch[1];
    if (!showCommandPalette.value) {
      openCommandPalette();
    }
    activeCommandIndex.value = 0;
  } else if (showCommandPalette.value) {
    closeCommandPalette();
  }
};

const handleInputKeydown = (e: KeyboardEvent) => {
  if (!showCommandPalette.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeCommandIndex.value = (activeCommandIndex.value + 1) % filteredCommands.value.length;
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeCommandIndex.value =
      (activeCommandIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length;
    return;
  }

  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    if (filteredCommands.value.length > 0) {
      selectCommand(filteredCommands.value[activeCommandIndex.value]);
    }
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    closeCommandPalette();
    return;
  }
};

// 最近访问
const recentVisits = ref<RecentVisitItem[]>([]);

// 待办事项
const pendingTasks = ref<PendingTaskItem[]>([]);
const tasksLoading = ref(false);

// DOM引用
const messagesContainer = ref<HTMLElement | null>(null);
const showScrollBottom = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// ════════════════════════════════════════
// 方法实现
// ════════════════════════════════════════

// 导航方法
const navigateTo = (path: string) => {
  router.push(path);
};

// 处理快捷操作点击（支持模态框和页面导航）
const handleQuickAction = (action: QuickActionItem) => {
  if (action.action === 'tab') {
    if (action.path === 'smart-form') {
      showSmartFormModal.value = true;
    } else if (action.path === 'smart-import') {
      showSmartImportModal.value = true;
    }
  } else {
    navigateTo(action.path);
  }
};

// 刷新俏皮话
const refreshWittyComment = async () => {
  if (wittyLoading.value) return;
  wittyLoading.value = true;

  try {
    const today = new Date().toDateString();
    const cacheKey = `witty_comment_${today}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      wittyComment.value = JSON.parse(cached).comment;
    } else {
      // 随机选择一条（Phase 2将接入真实API）
      await new Promise(resolve => setTimeout(resolve, 300)); // 模拟延迟
      const randomComment = FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
      wittyComment.value = randomComment;

      localStorage.setItem(cacheKey, JSON.stringify({
        comment: randomComment,
        timestamp: Date.now()
      }));
    }
  } catch (error) {
    console.error('Failed to load witty comment:', error);
    wittyComment.value = FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
  } finally {
    wittyLoading.value = false;
  }
};

// 数据卡片点击
const handleCardClick = (card: DataCard) => {
  if (card.clickPath) {
    navigateTo(card.clickPath);
  }
};

// 格式化数字（大数以万为单位）
const formatNumber = (num: number | null): string => {
  if (num === null) return '0';
  if (typeof num === 'string') return num;
  if (num >= 10000) {
    const wan = (num / 10000).toFixed(num % 10000 === 0 ? 0 : 1);
    return `${wan}万`;
  }
  return num.toLocaleString('zh-CN');
};

// 趋势图标
const getTrendIcon = (direction: string): string => {
  switch (direction) {
    case 'up': return 'arrow-up';
    case 'down': return 'arrow-down';
    default: return 'minus';
  }
};

// 洗牌算法
const shuffleSuggestions = () => {
  const shuffled = [...STATIC_SUGGESTIONS].sort(() => Math.random() - 0.5);
  displayedSuggestions.value = shuffled.slice(0, 3);
};

// 快速提问（从欢迎消息功能列表）
const handleQuickQuestion = (question: string) => {
  inputText.value = question;
  handleSend();
};

// 添加活动记录（来自智能填单/导入组件）
const addActivity = (_activity: Record<string, unknown>) => {
};

// 发送消息
const handleSend = async (confirmed = false) => {
  const content = inputText.value.trim();
  if (!content && !selectedFile.value && !confirmed) return;
  if (isLoading.value) return;

  closeCommandPalette();

  if (!confirmed && isWriteIntentPrefix(content)) {
    const guidanceMsg = `⚠️ 该操作需要前往管理页面完成，AI助手仅支持数据查询。\n\n如需继续查询相关信息，请修改提问方式（如"查询配方"而非"创建配方"）。`;
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    });
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: guidanceMsg,
      timestamp: new Date(),
      writeGuidanceLinks: extractWriteNavigationLinks(content),
    });
    inputText.value = '';
    return;
  }

  if (!confirmed) {
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    });
    inputText.value = '';
    selectedFile.value = null;
  }

  await nextTick();
  scrollToBottom();

  const startTime = Date.now();
  isLoading.value = true;
  streamingContent.value = '';

  try {
    const token = localStorage.getItem('tingstudio_token');

    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: confirmed ? '确认' : content,
        sessionId: conversationId.value,
        stream: true,
        confirmed,
        model: currentProvider.value,
        modelVersion: currentModelVersion.value
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let currentToolCalls: ToolCallItem[] = [];
    let currentIntent: IntentData | null = null;
    let pendingConfirm: PendingConfirmData | null = null;
    let lastToolResult: ToolResultData | null = null;
    let writeGuidanceLinks: Array<{ message: string; navigationLink: string }> = [];
    let lastDataTime = Date.now();
    const SSE_TIMEOUT_MS = 20000;

    const heartbeatCheck = setInterval(() => {
      if (Date.now() - lastDataTime > SSE_TIMEOUT_MS && isLoading.value) {
        console.warn('[AiWorkspace] SSE心跳超时，尝试重连...');
        clearInterval(heartbeatCheck);
      }
    }, 5000);

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lastDataTime = Date.now();

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              switch (parsed.type) {
                case 'chunk':
                  streamingContent.value += parsed.content;
                  fullContent += parsed.content;
                  autoScrollToBottom();
                  break;

                case 'intent':
                  currentIntent = parsed;
                  break;

                case 'follow_up':
                  fullContent += parsed.message;
                  streamingContent.value += parsed.message;
                  autoScrollToBottom();
                  break;

                case 'confirm':
                  pendingConfirm = {
                    toolName: parsed.toolName,
                    params: parsed.params,
                    message: parsed.message
                  };
                  fullContent += parsed.message;
                  streamingContent.value += parsed.message;
                  autoScrollToBottom();
                  break;

                case 'form':
                  pendingFormSchema.value = parsed.formSchema as FormSchema;
                  pendingFormSessionId.value = parsed.sessionId || conversationId.value || '';
                  if (parsed.message) {
                    fullContent += parsed.message;
                    streamingContent.value += parsed.message;
                  }
                  break;

                case 'tool_calls':
                  currentToolCalls = parsed.calls || [];
                  break;

                case 'content_clear':
                  streamingContent.value = '';
                  fullContent = '';
                  break;

                case 'tool_result':
                  currentToolCalls = currentToolCalls.filter(
                    (tc: ToolCallItem) => tc.name !== parsed.name
                  );
                  lastToolResult = {
                    displayType: parsed.displayType || 'card',
                    toolName: parsed.toolName || parsed.name,
                    data: parsed.data,
                    success: parsed.success,
                  };
                  break;

                case 'write_guidance':
                  if (parsed.message) {
                    fullContent += parsed.message;
                    streamingContent.value += parsed.message;
                    autoScrollToBottom();
                  }
                  if (parsed.navigationLink) {
                    writeGuidanceLinks.push({
                      message: parsed.message || '',
                      navigationLink: parsed.navigationLink,
                    });
                  }
                  break;

                case 'done':
                  clearInterval(heartbeatCheck);
                  if (parsed.sessionId) {
                    conversationId.value = parsed.sessionId;
                    sessionStorage.setItem(CONVERSATION_ID_KEY, parsed.sessionId);
                  }

                  messages.value.push({
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: fullContent,
                    timestamp: new Date(),
                    metadata: {
                      model: parsed.model || displayModelName.value,
                      tokens: parsed.usage?.total_tokens || fullContent.length,
                      latency: parsed.latency || (Date.now() - startTime),
                      intent: currentIntent?.intent,
                      tokenUsage: parsed.usage || null,
                    },
                    actions: parseActionsFromResponse(fullContent),
                    toolResult: currentToolCalls.length === 0 ? undefined : currentToolCalls,
                    toolResultData: lastToolResult,
                    pendingConfirm,
                    formSchema: pendingFormSchema.value,
                    writeGuidanceLinks: writeGuidanceLinks.length > 0 ? writeGuidanceLinks : undefined,
                  });

                  if (pendingConfirm) {
                    confirmMessage.value = pendingConfirm.message;
                    confirmToolName.value = pendingConfirm.toolName;
                    confirmParams.value = pendingConfirm.params;
                    confirmDialogVisible.value = true;
                  }

                  streamingContent.value = '';
                  isLoading.value = false;
                  pendingFormSchema.value = null;
                  loadSessions();
                  scrollToBottom();
                  return;

                case 'error':
                  clearInterval(heartbeatCheck);
                  throw new Error(parsed.message || 'AI 服务错误');
              }
            } catch (parseError: unknown) {
              if (parseError instanceof Error && parseError.message && !parseError.message.includes('JSON')) {
                throw parseError;
              }
            }
          }
        }
      }
    }

    if (fullContent) {
      let recoveredFormSchema: FormSchema | null = null;
      try {
        const formRes = await agentApi.getPendingForm(conversationId.value || '');
        if (formRes.success && formRes.data) {
          recoveredFormSchema = formRes.data as FormSchema;
        }
      } catch {
        // ignore pending form recovery failure
      }

      messages.value.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        metadata: {
          model: displayModelName.value,
          tokens: fullContent.length,
          latency: Date.now() - startTime,
          tokenUsage: null,
        },
        actions: parseActionsFromResponse(fullContent),
        formSchema: recoveredFormSchema ?? undefined,
      });
      streamingContent.value = '';
    }

    isLoading.value = false;

  } catch (error: unknown) {
    console.error('Chat error:', error);
    recordPerformance('errors');
    const errorMessage = error instanceof Error ? error.message : '网络连接异常';
    showErrorToast(`AI 对话失败: ${errorMessage}`);

    console.warn('Falling back to mock response due to:', errorMessage);

    await new Promise(resolve => setTimeout(resolve, 800));
    const mockResponse = getMockResponse(content);

    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex < mockResponse.length) {
        streamingContent.value += mockResponse[currentIndex];
        currentIndex++;
        autoScrollToBottom();
      } else {
        clearInterval(streamInterval);

        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: mockResponse,
          timestamp: new Date(),
          metadata: {
            model: displayModelName.value,
            tokens: mockResponse.length,
            latency: 800
          },
          actions: parseActionsFromResponse(mockResponse)
        });

        streamingContent.value = '';
        isLoading.value = false;
        loadSessions();
      }
    }, 15);
  }
};

// 初始化防抖函数（Phase 5 预留，按需启用）
// debouncedHandleSend = debounce(handleSend, 200)

// 模拟响应（Phase 3替换为真实API）
const getMockResponse = (query: string): string => {
  if (query.includes('销量')) {
    return `根据数据分析，本月销量呈现以下特点：\n\n📊 **总销售额**: ¥2,450,000 (+18% vs 上月)\n📈 **增长最快**: 配方#F2024-088 (+32%)\n⚠️ **需要关注**: 华南地区销量下降5%\n\n建议重点关注华南地区的市场推广策略。`;
  }
  if (query.includes('配方')) {
    return `关于配方的优化建议：\n\n✅ 当前热门配方TOP3已更新\n🔬 建议优化原料配比以降低成本约8%\n📝 可以尝试新建实验配方进行测试\n\n需要我帮你创建新配方吗？`;
  }
  if (query.includes('库存')) {
    return `库存预警信息：\n\n🚨 **紧急**: 维生素C库存仅剩3天用量\n⚠️ **注意**: 蛋白粉库存低于安全线\n✅ **正常**: 其他原料库存充足\n\n建议立即安排维生素C的采购订单。`;
  }
  return `收到你的问题："${query}"\n\n作为TingStudio AI助手，我可以帮助你：\n- 分析销售数据和趋势\n- 优化配方和降低成本\n- 管理原料库存\n- 生成各类报告\n\n请告诉我你具体想了解什么？`;
};

const CLICKABLE_PROMPT_PATTERNS = [
  /查看(改配方|该配方|此配方|配方)(营养成分|营养|成分)/g,
  /校验(含量比|比例|配比)/g,
  /查看(报价|价格|成本)/g,
  /分析(销售|销量|趋势|数据)/g,
  /优化(配方|成本|结构)/g,
  /生成(周报|月报|报告|报表)/g,
  /对比(配方|数据|销量|价格)/g,
  /预测(需求|趋势|用量)/g,
  /检查(库存|原料|用量)/g,
  /导出(数据|报表|报告)/g,
  /计算(成本|含量|比例)/g,
  /搜索(配方|原料|业务员)/g,
  /查询(库存|价格|销量)/g,
  /创建(配方|原料|业务员)/g,
  /修改(配方|原料|价格)/g,
  /删除(配方|原料|记录)/g,
];

const enhanceMarkdownHtml = (html: string): string => {
  let enhanced = html;

  enhanced = enhanced.replace(/<table([^>]*)>/g, (_match, attrs) => {
    return `<div class="md-table-wrapper"><div class="md-table-copy-btn" title="复制表格数据"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg><span>复制</span></div><table${attrs}>`;
  });
  enhanced = enhanced.replace(/<\/table>/g, '</table></div>');

  for (const pattern of CLICKABLE_PROMPT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    enhanced = enhanced.replace(regex, (match) => {
      return `<span class="clickable-prompt" data-prompt="${match}">${match}</span>`;
    });
  }

  enhanced = enhanced.replace(/【([^】]+)】/g, (match, content) => {
    const isAction = /^(查看|校验|分析|优化|生成|对比|预测|检查|导出|计算|搜索|查询|创建|修改|删除|打开|前往)/.test(content);
    if (isAction) {
      return `<span class="clickable-prompt" data-prompt="${content}">${match}</span>`;
    }
    return match;
  });

  return enhanced;
};

const renderMarkdown = (content: string): string => {
  try {
    const html = marked(content) as string;
    return enhanceMarkdownHtml(html);
  } catch {
    return content;
  }
};

const handleMarkdownClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  const clickableEl = target.closest('.clickable-prompt') as HTMLElement | null;
  if (clickableEl) {
    const prompt = clickableEl.dataset.prompt;
    if (prompt) {
      inputText.value = prompt;
      handleSend();
    }
    return;
  }

  const copyBtn = target.closest('.md-table-copy-btn') as HTMLElement | null;
  if (copyBtn) {
    const wrapper = copyBtn.closest('.md-table-wrapper');
    const table = wrapper?.querySelector('table');
    if (table) {
      copyTableToClipboard(table);
    }
    return;
  }
};

const copyTableToClipboard = async (table: HTMLTableElement) => {
  try {
    const rows = table.querySelectorAll('tr');
    const lines: string[] = [];
    rows.forEach(row => {
      const cells = row.querySelectorAll('th, td');
      const line = Array.from(cells).map(cell => cell.textContent?.trim() || '').join('\t');
      if (line) lines.push(line);
    });
    const text = lines.join('\n');
    await navigator.clipboard.writeText(text);
    showActionToast('表格数据已复制到剪贴板');
  } catch (e) {
    console.error('复制表格失败:', e);
    showActionToast('复制失败，请手动选择复制');
  }
};

// 执行操作（Phase 4: 完整实现）
interface ActionItem {
  id: string;
  label: string;
  icon?: string;
  type: 'navigate' | 'api' | 'copy' | 'download' | 'create';
  payload?: Record<string, unknown>;
}

// 操作类型定义
const ACTION_PATTERNS = {
  navigate: /(?:跳转|前往|打开|查看|进入)\s*(?:页面|)?【?([^】]+)】?/g,
  create: /(?:创建|新建|添加|生成)\s*(?:新的|)?【?([^】]+)】?/g,
  export: /(?:导出|下载|保存|输出)\s*(?:为|成|到)?【?([^】]+)】?/g,
  copy: /(?:复制|拷贝)\s*(?:文本|内容|数据)?【?([^】]+)】?/g,
  search: /(?:搜索|查找|查询)\s*(?:关于|)?【?([^】]+)】?/g
};

const executeAction = (action: ActionItem) => {
  switch (action.type) {
    case 'navigate':
      if (action.payload?.path && typeof action.payload.path === 'string') {
        router.push(action.payload.path);
      }
      break;

    case 'create':
      if (action.payload?.type === 'formula') {
        router.push('/formulas/new');
      } else if (action.payload?.type === 'material') {
        router.push('/materials/new');
      } else if (action.payload?.type === 'report') {
        router.push('/reports/generate');
      }
      break;

    case 'copy':
      if (action.payload?.text && typeof action.payload.text === 'string') {
        navigator.clipboard.writeText(action.payload.text).then(() => {
        });
      }
      break;

    case 'download':
      if (action.payload?.url || action.payload?.path) {
        const url = String(action.payload.url || action.payload.path);
        window.open(url.startsWith('http') ? url : `${window.location.origin}${url}`, '_blank');
      }
      break;

    default:
      console.warn('Unknown action type:', action.type);
  }
};

// 从 AI 响应中提取可操作的动作
const parseActionsFromResponse = (content: string): ActionItem[] => {
  const actions: ActionItem[] = [];

  // 检测导航类操作
  const navMatches = content.matchAll(ACTION_PATTERNS.navigate);
  for (const match of navMatches) {
    const target = match[1]?.trim();
    if (target) {
      let path = '';

      // 关键词映射到路由路径
      if (target.includes('配方') || target.includes('formula')) path = '/formulas';
      else if (target.includes('原料') || target.includes('material')) path = '/materials';
      else if (target.includes('销量') || target.includes('销售')) path = '/sales';
      else if (target.includes('报告')) path = '/reports';
      else if (target.includes('导出')) path = '/system/config';
      else if (target.includes('文件')) path = '/files';
      else if (target.includes('营养')) path = '/nutrition';
      else if (target.includes('工具')) path = '/tools';

      if (path) {
        actions.push({
          id: `nav_${Date.now()}_${actions.length}`,
          label: `查看${target}`,
          icon: 'chevron-right',
          type: 'navigate',
          payload: { path, target }
        });
      }
    }
  }

  // 检测创建类操作
  const createMatches = content.matchAll(ACTION_PATTERNS.create);
  for (const match of createMatches) {
    const target = match[1]?.trim();
    if (target) {
      let type: 'formula' | 'material' | 'report' | undefined;

      if (target.includes('配方')) type = 'formula';
      else if (target.includes('原料')) type = 'material';
      else if (target.includes('报告') || target.includes('周报') || target.includes('月报')) type = 'report';

      if (type) {
        actions.push({
          id: `create_${Date.now()}_${actions.length}`,
          label: `创建${target}`,
          icon: 'add-circle',
          type: 'create',
          payload: { type, target }
        });
      }
    }
  }

  return actions.slice(0, 3); // 最多显示3个操作按钮
};

// AI 推荐智能更新（基于用户行为）
const updateSuggestionsBasedOnContext = () => {
  const currentPath = route.path;

  // 根据当前所在页面调整推荐
  if (currentPath.includes('/formulas')) {
    displayedSuggestions.value = [
      { text: '📊 分析这个配方的成本结构', category: 'analytics' },
      { text: '🔬 推荐相似的高销量配方', category: 'optimization' },
      { text: '⚠️ 检查原料库存是否充足', category: 'analytics' }
    ];
  } else if (currentPath.includes('/sales')) {
    displayedSuggestions.value = [
      { text: '📈 预测下月销量趋势', category: 'analytics' },
      { text: '📝 生成本月销售报告', category: 'reporting' },
      { text: '🔍 对比去年同期数据', category: 'analytics' }
    ];
  } else if (currentPath.includes('/materials')) {
    displayedSuggestions.value = [
      { text: '💰 分析原料价格波动趋势', category: 'analytics' },
      { text: '🚨 库存不足预警清单', category: 'analytics' },
      { text: '📋 生成采购建议单', category: 'optimization' }
    ];
  } else {
    // 默认推荐（已在 onMounted 中初始化）
    shuffleSuggestions();
  }
};

// 历史会话管理
const toggleHistory = () => {
  showHistory.value = !showHistory.value;
  if (showHistory.value) {
    loadSessions();
  }
};

const createNewSession = () => {
  conversationId.value = null;
  sessionStorage.removeItem(CONVERSATION_ID_KEY);
  messages.value = [];
  showHistory.value = true;
  agentStore.clearCurrentSession();
};

const loadSessions = async () => {
  await agentStore.loadSessions();
  sessions.value = agentStore.sessions.map((s): SessionDisplay => ({
    id: s.id,
    title: s.title,
    updatedAt: s.last_active_at,
  }));
};

const loadRoleConfig = async () => {
  try {
    const data = await agentApi.getRoleConfig();
    if (data) {
      roleConfig.value = {
        agent_name: data.agent_name || '小听',
        user_title: data.user_title || '老板',
        greeting: data.greeting || '',
        tone_style: data.tone_style || 'professional',
        custom_instructions: data.custom_instructions || '',
      };
    }
  } catch (e) {
    console.error('[Dashboard] loadRoleConfig failed:', e);
  }
};

const saveRoleConfig = async () => {
  roleConfigSaving.value = true;
  try {
    await agentApi.updateRoleConfig(roleConfig.value);
    showRoleConfigDialog.value = false;
    showActionToast('身份设置已保存');
  } catch {
    showErrorToast('保存身份设置失败');
  } finally {
    roleConfigSaving.value = false;
  }
};

const restoreSession = async () => {
  await loadSessions();

  const savedConversationId = sessionStorage.getItem(CONVERSATION_ID_KEY);
  if (savedConversationId) {
    const exists = sessions.value.some((s) => s.id === savedConversationId);
    if (exists) {
      await switchToSession(savedConversationId);
      return;
    }
  }

  if (sessions.value.length > 0) {
    await switchToSession(sessions.value[0].id);
  }
};

const deleteSessionFromHistory = async (sessionId: string, event?: Event) => {
  event?.stopPropagation();
  await agentStore.deleteSession(sessionId);
  if (conversationId.value === sessionId) {
    conversationId.value = null;
    sessionStorage.removeItem(CONVERSATION_ID_KEY);
    messages.value = [];
    if (sessions.value.length > 0) {
      await switchToSession(sessions.value[0].id);
    }
  }
  await loadSessions();
};

const switchToSession = async (sessionId: string) => {
  await agentStore.loadSessionMessages(sessionId);
  conversationId.value = sessionId;
  sessionStorage.setItem(CONVERSATION_ID_KEY, sessionId);
  messages.value = agentStore.messages.map((m): ChatMessage => {
    const metadata = m.metadata ? (typeof m.metadata === 'string' ? JSON.parse(m.metadata as string) : m.metadata) : {};
    const toolResults = m.tool_results ? (typeof m.tool_results === 'string' ? JSON.parse(m.tool_results as string) : m.tool_results) : null;
    const displayType = m.display_type || null;

    let toolResultData: ToolResultData | null = null;
    if (toolResults && toolResults.length > 0) {
      const firstResult = toolResults[0] as Record<string, unknown>;
      toolResultData = {
        displayType: displayType || 'card',
        toolName: (firstResult.toolName || firstResult.name || null) as string,
        data: (firstResult as Record<string, unknown>).result && typeof (firstResult as Record<string, unknown>).result === 'object'
          ? ((firstResult as Record<string, unknown>).result as Record<string, unknown>).data || firstResult
          : firstResult,
        success: ((firstResult as Record<string, unknown>).result ? (firstResult as Record<string, unknown>).result as Record<string, unknown> : firstResult).success !== undefined
          ? Boolean(((firstResult as Record<string, unknown>).result ? (firstResult as Record<string, unknown>).result as Record<string, unknown> : firstResult).success)
          : true,
      };
    }

    return {
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.created_at),
      metadata: metadata as ChatMessage["metadata"],
      toolResultData,
      actions: [],
    };
  });

  try {
    const res = await agentApi.getPendingForm(sessionId);
    if (res.success && res.data) {
      const lastAssistantMsg = messages.value.filter(m => m.role === 'assistant').pop();
      if (lastAssistantMsg && !lastAssistantMsg.formSchema) {
        lastAssistantMsg.formSchema = res.data as FormSchema;
        lastAssistantMsg.formSubmitted = false;
      }
    }
  } catch {
    // ignore form schema fetch failure
  }

  scrollToBottom();
};

const handleConfirmAction = () => {
  confirmDialogVisible.value = false;
  handleSend(true);
};

const handleCancelAction = () => {
  confirmDialogVisible.value = false;
  messages.value.push({
    id: Date.now().toString(),
    role: 'assistant',
    content: '操作已取消。',
    timestamp: new Date(),
  });
};

const handleFormSubmit = async (msg: ChatMessage, formData: Record<string, unknown>) => {
  try {
    const token = localStorage.getItem('tingstudio_token');
    const response = await fetch('/api/agent/submit-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId: conversationId.value,
        formId: msg.formSchema?.formId ?? "",
        formData,
      }),
    });

    const result = await response.json();

    if (result.success) {
      msg.formSubmitted = true;
      msg.formSubmitSuccess = true;
      showActionToast('操作成功');
    } else if (result.validationErrors && result.validationErrors.length > 0) {
      const errorMessages = result.validationErrors.map((e: ValidationError) => e.message).join('；');
      showActionToast(errorMessages);
    } else {
      msg.formSubmitted = true;
      msg.formSubmitSuccess = false;
      showActionToast(result.error || '操作失败');
    }
  } catch (error: unknown) {
    msg.formSubmitted = true;
    msg.formSubmitSuccess = false;
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    showActionToast(`提交失败：${errorMsg}`);
  }
};

const handleFormCancel = (msg: ChatMessage) => {
  msg.formSubmitted = true;
  msg.formSubmitSuccess = false;
  messages.value.push({
    id: Date.now().toString(),
    role: 'assistant',
    content: '表单已取消。',
    timestamp: new Date(),
  });
};

// 文件上传
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    selectedFile.value = file;
    handleSend();
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const autoScrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      const isNearBottom = messagesContainer.value.scrollHeight -
        messagesContainer.value.scrollTop -
        messagesContainer.value.clientHeight < 300;

      if (isNearBottom) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    }
  });
};

const handleMessagesScroll = () => {
  if (!messagesContainer.value) return;
  const isNearBottom = messagesContainer.value.scrollHeight -
    messagesContainer.value.scrollTop -
    messagesContainer.value.clientHeight < 300;
  showScrollBottom.value = !isNearBottom;
};

const scrollToBottomClick = () => {
  scrollToBottom();
  showScrollBottom.value = false;
};

// 最近访问管理
const VISITS_STORAGE_KEY = 'tingstudio_recent_visits';

const loadRecentVisits = () => {
  try {
    const stored = localStorage.getItem(VISITS_STORAGE_KEY);
    recentVisits.value = stored ? JSON.parse(stored) : [];
  } catch {
    recentVisits.value = [];
  }
};

const fetchPendingTasks = async () => {
  tasksLoading.value = true;
  try {
    // Phase 2对接真实API，这里用mock数据
    await new Promise(resolve => setTimeout(resolve, 500));
    pendingTasks.value = [];
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
  } finally {
    tasksLoading.value = false;
  }
};

// 时间格式化
const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return d.toLocaleDateString('zh-CN');
};

// 数据加载（Phase 2: 对接真实API）
const fetchDashboardData = async () => {
  try {
    const response = await http.get<unknown, DashboardStatsResponse>('/dashboard/stats', { _logLabel: 'Dashboard Stats' });

    dataCards.value = dataCards.value.map((card) => {
      let value: number | null = null;
      let trend = null;

      switch (card.id) {
        case 'formulas':
          value = response.formulas || 0;
          trend = { direction: 'up' as const, value: '+12%' };
          break;
        case 'materials':
          value = response.materials || 0;
          trend = { direction: 'up' as const, value: '+5新增' };
          break;
        case 'sales':
          value = response.sales?.revenue || 0;
          trend = { direction: 'up' as const, value: '+18%' };
          break;
        case 'pending':
          value = response.pendingTasks || 0;
          trend = null;
          break;
      }

      return {
        ...card,
        value,
        trend,
        loading: false
      };
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);

    // Phase 5: 记录错误但不显示提示（使用 fallback 数据）
    recordPerformance('errors');
    console.warn('[Dashboard] 使用默认数据作为 fallback');

    // Fallback: 使用默认值显示
    dataCards.value = dataCards.value.map((card, index) => ({
      ...card,
      value: [128, 56, 2400000, 3][index],
      trend: index < 3 ?
        { direction: index % 2 === 0 ? 'up' as const : 'neutral' as const, value: index === 0 ? '+12%' : index === 1 ? '+5新增' : '+18%' }
        : null,
      loading: false
    }));
  }
};

// ════════════════════════════════════════
// 生命周期
// ════════════════════════════════════════

onMounted(async () => {
  const loadStartTime = Date.now();

  Promise.all([
    refreshWittyComment(),
    fetchDashboardData(),
    loadRecentVisits(),
    fetchPendingTasks(),
    shuffleSuggestions(),
  ]).catch(() => { });

  await modelStore.fetchModels().catch(() => { });
  fetchAllModelVersions();

  try {
    await restoreSession();
  } catch (e) {
    console.error('[Dashboard] restoreSession failed:', e);
  }

  loadRoleConfig();

  updateSuggestionsBasedOnContext();

  watch(() => route.path, () => {
    updateSuggestionsBasedOnContext();
  });

  watch(inputText, () => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
      textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px';
    }
  });

  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading.value && inputText.value.trim()) {
        handleSend();
      }
    }

    if (e.key === 'Escape' && document.activeElement?.tagName === 'TEXTAREA') {
      inputText.value = '';
    }

    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      textareaRef.value?.focus();
    }
  };

  window.addEventListener('keydown', handleKeyboardShortcuts);

  const handleClickOutside = (e: MouseEvent) => {
    if (showModelMenu.value && modelDropdownRef.value && !modelDropdownRef.value.contains(e.target as Node)) {
      showModelMenu.value = false;
    }
    if (showCommandPalette.value && inputWrapperRef.value && !inputWrapperRef.value.contains(e.target as Node)) {
      closeCommandPalette();
    }
  };
  document.addEventListener('click', handleClickOutside);

  recordPerformance('loadTime', Date.now() - loadStartTime);

    ; (window as unknown as Record<string, unknown>).__dashboardCleanup = () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
      document.removeEventListener('click', handleClickOutside);
    };
});

onUnmounted(() => {
  const win = window as unknown as Record<string, unknown>;
  if (win.__dashboardCleanup) {
    ; (win.__dashboardCleanup as () => void)();
    delete win.__dashboardCleanup;
  }
  if (win.__sseHeartbeatCheck) {
    clearInterval(win.__sseHeartbeatCheck as ReturnType<typeof setInterval>);
    delete win.__sseHeartbeatCheck;
  }
});
</script>

<style scoped lang="scss">
// ════════════════════════════════════════
// Phase 5: 全局错误提示样式
// ════════════════════════════════════════
.global-error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #991b1b;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(239, 68, 68, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 480px;
  border-left: 4px solid var(--color-danger);
  animation: slideInRight 0.3s ease-out;

  .error-close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #991b1b;
    opacity: 0.7;
    transition: all 0.2s;
    margin-left: auto;

    &:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.3s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.action-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  background: linear-gradient(135deg, #ecfdf5, var(--color-primary-bg));
  color: #065f46;
  padding: var(--space-2-5) 20px;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--color-primary-lightest);
  animation: toastIn 0.3s ease-out;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.form-submitted-notice {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-1-5) var(--space-3-5);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background: #f0f9ff;
  color: #0369a1;
  margin-top: 4px;
}

.write-guidance-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5);
  margin-top: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.guidance-link-item {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: 13px;
}

.guidance-nav-link {
  color: #16a34a;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: #15803d;
    text-decoration: underline;
  }
}

.ai-dashboard {
  display: flex;
  flex-direction: column;
  height: 100% !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 20px;
  align-items: stretch;
  height: 100% !important;
  overflow: hidden !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 !important;
  box-sizing: border-box !important;
  max-height: 100% !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: var(--radius-2xs);
  }
}

.layout-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100% !important;
  overflow: hidden !important;
  padding: 0 !important; // 不再添加额外padding
  margin: 0 !important;
}

// ════════════════════════════════════════
// 区域1: 数据卡片
// ════════════════════════════════════════
.data-overview-cards {
  .cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

.data-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  animation: cardFadeIn 0.5s ease both;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);

    &.card-emerald {
      border-color: var(--color-primary);
    }

    &.card-blue {
      border-color: #3B82F6;
    }

    &.card-purple {
      border-color: #8B5CF6;
    }

    &.card-amber {
      border-color: var(--color-warning);
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .card-title {
      font-size: 12px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }
  }

  .card-value {
    margin-bottom: 8px;

    .value-number {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .skeleton-value {
      height: 28px;
      width: 80px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
  }

  .card-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;

    .trend-up {
      color: var(--color-primary);
    }

    .trend-down {
      color: var(--color-danger);
    }

    .trend-neutral {
      color: var(--color-text-secondary);
    }
  }

  .card-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    background: var(--color-danger);
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 4px var(--space-2-5);
    border-radius: 12px;
  }

  // 卡片主题色
  &.card-emerald .card-header {
    color: var(--color-primary);
  }

  &.card-blue .card-header {
    color: #3B82F6;
  }

  &.card-purple .card-header {
    color: #8B5CF6;
  }

  &.card-amber .card-header {
    color: var(--color-warning);
  }

  &.loading {
    pointer-events: none;
  }

  @media (max-width: 1200px) {
    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

.card-fade-enter-active,
.card-fade-leave-active {
  transition: all 0.3s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

// ════════════════════════════════════════
// 区域2: 快捷操作 + AI推荐
// ════════════════════════════════════════
.quick-actions-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-x: hidden;
  padding-top: 4px;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 4px;
  padding-bottom: 4px;

  .action-item {
    padding: var(--space-3-5) 12px;
    border-radius: 10px;
    border: 2px solid var(--color-border);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1-5);
    background: white;
    position: relative;

    &:hover {
      border-color: var(--color-primary);
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
    }

    &:active {
      transform: translateY(-1px);
    }

    &.primary {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      color: white;
      border-color: transparent;

      &:hover {
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      }
    }

    &.ai-feature::after {
      content: '✨';
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 16px;
    }

    .action-label {
      font-size: 13px;
      font-weight: 500;
      text-align: center;
    }

    .action-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--color-danger);
      color: white;
      font-size: 10px;
      padding: var(--space-0-5) var(--space-1-5);
      border-radius: 10px;
      font-weight: 600;
    }
  }

  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.ai-suggestion-bubble {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #bae6fd;
  border-radius: 20px;
  padding: 20px;
  position: relative;
  height: fit-content;

  &::before {
    content: '';
    position: absolute;
    left: -12px;
    top: 30px;
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 12px solid #bae6fd;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;

    .ai-logo {
      width: 28px;
      height: 28px;
      flex-shrink: 0;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .bubble-title {
      font-weight: 600;
      color: #0369a1;
      flex: 1;
    }

    .refresh-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #0ea5e9;
      padding: 4px;
      border-radius: 50%;

      &:hover {
        background: #bae6fd;
      }
    }
  }

  .bubble-content {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .suggestion-item {
      padding: 12px 16px;
      background: white;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 3px solid transparent;

      &:hover {
        background: #f0fdf4;
        border-left-color: var(--color-primary);
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .suggestion-text {
        font-size: 14px;
        color: var(--color-text-primary);
      }

      .arrow-icon {
        color: var(--color-text-placeholder);
        transition: transform 0.2s;
      }

      &:hover .arrow-icon {
        transform: translateX(4px);
        color: var(--color-primary);
      }
    }
  }

  .bubble-footer {
    margin-top: 12px;
    text-align: center;

    .footer-hint {
      font-size: 11px;
      color: var(--color-text-secondary);
    }
  }

  @media (max-width: 992px) {
    grid-column: 1 / -1;

    &::before {
      display: none;
    }
  }
}

@media (max-width: 992px) {
  .quick-actions-row {
    grid-template-columns: 1fr;
  }
}

// ════════════════════════════════════════
// 区域3: AI对话区
// ════════════════════════════════════════
.ai-chat-section {
  flex: 1;
  min-height: 0; // 移除固定最小高度，让内容自适应
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  // Tab 导航栏样式
  .ai-tabs-nav {
    display: flex;
    gap: 8px;
    padding: 12px 24px;
    background: white;
    border-bottom: 1px solid #f1f5f9;
    overflow-x: auto;

    &::-webkit-scrollbar {
      display: none;
    }

    .ai-tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: var(--space-2-5) var(--space-4-5);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: white;
      cursor: pointer;
      transition: all 0.25s ease;
      white-space: nowrap;
      font-size: 14px;
      color: var(--color-text-secondary);

      &:hover {
        border-color: #0052D9;
        color: #0052D9;
        background: #f0f7ff;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 82, 217, 0.1);
      }

      &.active {
        background: linear-gradient(135deg, #0052D9, #003DB3);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 12px rgba(0, 82, 217, 0.25);

        .tab-desc {
          color: rgba(255, 255, 255, 0.85);
        }
      }

      .tab-icon {
        font-size: 18px;
      }

      .tab-label {
        font-weight: 600;
        font-size: 14px;
      }

      .tab-desc {
        font-size: 11px;
        color: var(--color-text-placeholder);
        margin-left: 4px;
      }
    }
  }

  // Tab 内容面板
  .tab-content-panel {
    flex: 1;
    overflow-y: auto;
    background: #fafbfc;
  }

  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .chat-body-row {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    position: relative;
    transition: flex 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .history-sidebar {
    width: 260px;
    flex-shrink: 0;
    border-right: 1px solid var(--color-border);
    background: #fafbfc;
    overflow: hidden;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.collapsed {
      width: 52px;
      border-right: 1px solid var(--color-border);
    }

    .history-sidebar-inner {
      width: 260px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .history-header {
      padding: 12px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;

      h4 {
        flex: 1;
        font-size: 14px;
        color: var(--color-text-primary);
        white-space: nowrap;
      }

      .role-config-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        color: var(--color-text-placeholder);
        transition: all 0.2s;

        &:hover {
          color: #4b6bfb;
          background: #eef2ff;
        }
      }

      .action-circle-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;

        &:hover {
          background: #f1f5f9;
          color: var(--color-primary);
        }

        &.active {
          color: var(--color-primary);
          background: #ecfdf5;
        }
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: var(--color-text-secondary);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        flex-shrink: 0;
        transition: all 0.2s;

        &:hover {
          background: #f1f5f9;
          color: var(--color-text-primary);
        }
      }
    }

    .new-session-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 12px;
      padding: 8px 12px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      color: var(--color-text-secondary);
      font-size: 13px;
      transition: all 0.2s;
      white-space: nowrap;

      &:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
        background: #f0fdf4;
      }
    }

    .history-list {
      flex: 1;
      overflow-y: auto;
    }

    .history-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;

      &:hover {
        background: #f1f5f9;

        .session-delete-btn {
          opacity: 1;
        }
      }

      &.active {
        background: #e0f2fe;
        border-left: 3px solid #0ea5e9;

        .session-delete-btn {
          opacity: 0;
        }

        &:hover .session-delete-btn {
          opacity: 1;
        }
      }

      .session-info {
        flex: 1;
        min-width: 0;
      }

      .session-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
      }

      .session-time {
        font-size: 12px;
        color: var(--color-text-placeholder);
        display: block;
      }

      .session-delete-btn {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--color-text-placeholder);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.2s;
        flex-shrink: 0;

        &:hover {
          background: #fee2e2;
          color: var(--color-danger);
        }
      }
    }

    .empty-sessions {
      padding: 40px 16px;
      text-align: center;
      color: var(--color-text-placeholder);
      font-size: 14px;
    }
  }

  .messages-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    padding-top: 24px;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: var(--radius-xs);

      &:hover {
        background: var(--color-text-placeholder);
      }
    }
  }

  .scroll-bottom-btn {
    position: absolute;
    bottom: 80px;
    right: 28px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: white;
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;

    &:hover {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
    }

    &:active {
      transform: translateY(0);
    }

    .scroll-btn-pulse {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-primary);
      animation: pulse 1.5s ease-in-out infinite;
    }
  }

  .scroll-btn-fade-enter-active,
  .scroll-btn-fade-leave-active {
    transition: all 0.3s ease;
  }

  .scroll-btn-fade-enter-from,
  .scroll-btn-fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
    }

    70% {
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
    }

    100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }

  .message-item {
    margin-bottom: 20px;
    display: flex;
    gap: 12px;
    animation: fadeInUp 0.3s ease;

    &.message-user {
      flex-direction: row-reverse;
      align-items: flex-start;

      .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        flex-shrink: 0;
        background: white;
        padding: var(--space-0-5);
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);

        .user-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }
      }

      .user-message-content {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        max-width: 70%;
      }

      .user-bubble {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: white;
        max-width: 100%;
        padding: 12px var(--space-4-5);
        border-radius: 18px 18px 4px 18px;
        word-wrap: break-word;
        line-height: 1.5;
      }

      .user-message-footer {
        margin-top: 4px;
      }

      .message-time {
        font-size: 11px;
        color: var(--color-text-placeholder);
      }
    }

    &.message-assistant {
      .avatar-logo {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        flex-shrink: 0;
        background: white;
        padding: var(--space-1);
        overflow: hidden;

        svg {
          width: 100%;
          height: 100%;
        }
      }

      .assistant-message-content {
        display: flex;
        flex-direction: column;
        max-width: 80%;
      }

      .assistant-bubble {
        background: var(--color-bg-page);
        border: 1px solid var(--color-border);
        padding: 26px 30px;
        border-radius: 18px 18px 18px 4px;

        .markdown-content {
          line-height: 1.6;

          h1,
          h2,
          h3 {
            color: var(--color-text-primary);
            margin-top: 12px;
            margin-bottom: 8px;
          }

          p {
            margin-bottom: 8px;
          }

          code {
            background: var(--color-border);
            padding: var(--space-0-5) var(--space-1-5);
            border-radius: 4px;
            font-family: 'Monaco', monospace;
            font-size: 13px;
          }

          pre {
            background: var(--color-text-primary);
            color: var(--color-border);
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;

            code {
              background: transparent;
              color: inherit;
            }
          }

          ul,
          ol {
            padding-left: 20px;
            margin-bottom: 8px;
          }

          li {
            margin-bottom: 4px;
          }

          strong {
            font-weight: 600;
            color: var(--color-text-primary);
          }

          .clickable-prompt {
            color: var(--color-primary);
            cursor: pointer;
            font-weight: 500;
            border-bottom: 1px dashed var(--color-primary);
            transition: all 0.2s;
            padding: 0 var(--space-0-5);
            border-radius: var(--radius-2xs);

            &:hover {
              background: #ecfdf5;
              border-bottom-style: solid;
            }

            &:active {
              background: var(--color-primary-bg);
              transform: scale(0.98);
            }
          }

          .md-table-wrapper {
            position: relative;
            margin: 12px 0;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            overflow: hidden;

            .md-table-copy-btn {
              position: absolute;
              top: 6px;
              right: 6px;
              z-index: 2;
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 4px var(--space-2-5);
              background: white;
              border: 1px solid var(--color-border);
              border-radius: 6px;
              font-size: 12px;
              color: var(--color-text-secondary);
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

              &:hover {
                background: #f0fdf4;
                border-color: var(--color-primary);
                color: var(--color-primary);
              }

              &:active {
                transform: scale(0.95);
              }

              svg {
                flex-shrink: 0;
              }
            }

            table {
              margin: 0;
              border-collapse: collapse;
              width: 100%;
              font-size: 13px;

              th,
              td {
                padding: 8px 12px;
                border: 1px solid var(--color-border);
                text-align: left;
              }

              th {
                background: #f1f5f9;
                font-weight: 600;
                color: var(--color-text-primary);
              }

              td {
                color: var(--color-text-secondary);
              }

              tr:nth-child(even) td {
                background: var(--color-bg-page);
              }
            }
          }
        }

        .message-actions {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;

          .action-btn {
            padding: 8px 16px;
            background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: var(--space-1-5);
            transition: all 0.2s;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
          }
        }

        .message-meta {
          margin-top: 12px;
          font-size: 11px;
          color: var(--color-text-placeholder);
          display: flex;
          gap: var(--space-1-5);
          align-items: center;

          .meta-model-logo {
            width: 14px;
            height: 14px;
            border-radius: var(--radius-2xs);
            vertical-align: middle;
          }

          .meta-model-logo-fallback {
            width: 14px;
            height: 14px;
            border-radius: var(--radius-2xs);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 700;
            vertical-align: middle;
            flex-shrink: 0;
          }

          .meta-model {
            background: #f1f5f9;
            color: var(--color-text-secondary);
            padding: 1px var(--space-1-5);
            border-radius: 4px;
            font-weight: 500;
          }

          .meta-latency {
            color: var(--color-text-secondary);
          }

          .token-usage {
            color: #6366f1;
            font-weight: 500;
          }
        }
      }
    }

    .message-action-icons {
      display: flex;
      gap: 4px;
      margin-top: var(--space-1-5);
      padding-left: 4px;
      opacity: 0;
      transition: opacity 0.2s;

      .msg-icon-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--color-text-placeholder);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        &:hover {
          background: #f1f5f9;
          color: var(--color-primary);
        }

        &:active {
          transform: scale(0.92);
        }
      }
    }

    &:hover .message-action-icons {
      opacity: 1;
    }

    &.typing .cursor-blink {
      animation: blink 1s step-end infinite;
      color: var(--color-primary);
      font-weight: bold;
      margin-left: var(--space-0-5);
    }
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 16px 20px;
    background: var(--color-bg-page);
    border-radius: 18px;
    width: fit-content;

    span {
      width: 8px;
      height: 8px;
      background: var(--color-text-placeholder);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;

      &:nth-child(1) {
        animation-delay: -0.32s;
      }

      &:nth-child(2) {
        animation-delay: -0.16s;
      }
    }
  }

  .welcome-message {
    text-align: center;
    padding: 40px 20px;

    .welcome-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .welcome-logo {
      width: 64px;
      height: 64px;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    h3 {
      font-size: 22px;
      color: var(--color-text-primary);
      margin-bottom: 0;
    }

    p {
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 20px 0;
      text-align: left;
      display: inline-block;

      li {
        padding: 8px 0;
        color: var(--color-text-secondary);

        &::before {
          content: '✨ ';
          margin-right: 8px;
        }
      }
    }

    .welcome-hint {
      color: var(--color-primary);
      font-weight: 500;
      margin-top: 16px;
    }

    .welcome-features {
      list-style: none;
      padding: 0;
      margin: 16px 0;

      li {
        padding: var(--space-2-5) 16px;
        margin: var(--space-1-5) 0;
        background: var(--color-bg-page);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border-color: #bae6fd;
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0, 82, 217, 0.1);
        }

        &:active {
          transform: translateX(2px);
        }
      }
    }
  }

  .quick-tags-bar {
    padding: 12px 24px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    border-top: 1px solid #f1f5f9;
    background: #fafbfc;

    &::-webkit-scrollbar {
      display: none;
    }

    .quick-tag {
      padding: var(--space-1-5) 16px;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: 20px;
      font-size: 13px;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--color-text-secondary);

      &:hover {
        background: #dbeafe;
        border-color: #93c5fd;
        color: #2563eb;
        transform: translateY(-1px);
      }
    }
  }

  .chat-input-bar {
    padding: var(--space-2-5) 24px;
    background: white;

    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      background: var(--color-bg-page);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-4xl);
      padding: 8px 16px;
      transition: all 0.25s ease;
      position: relative;

      &:focus-within {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        background: white;
      }

      .command-palette {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 0;
        right: 0;
        background: white;
        border: 1px solid var(--color-border);
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
        z-index: 200;
        overflow: hidden;
        max-height: 440px;
        display: flex;
        flex-direction: column;

        .command-palette-header {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          padding: var(--space-2-5) var(--space-3-5);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-bottom: 1px solid #f1f5f9;
          background: #fafbfc;
          flex-shrink: 0;
        }

        .command-category-tabs {
          display: flex;
          gap: 4px;
          padding: 8px var(--space-2-5);
          border-bottom: 1px solid #f1f5f9;
          overflow-x: auto;
          flex-shrink: 0;

          &::-webkit-scrollbar {
            height: 0;
          }

          .category-tab {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px var(--space-2-5);
            border-radius: 12px;
            border: 1px solid var(--color-border);
            background: white;
            font-size: 11px;
            font-weight: 500;
            color: var(--color-text-secondary);
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;

            &:hover {
              border-color: #cbd5e1;
              background: var(--color-bg-page);
            }

            &.active {
              border-color: var(--color-primary);
              color: var(--color-primary);
              background: #f0fdf4;
            }
          }
        }

        .command-palette-list {
          overflow-y: auto;
          padding: var(--space-1-5);

          &::-webkit-scrollbar {
            width: 4px;
          }

          &::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: var(--radius-2xs);
          }
        }

        .command-item {
          display: flex;
          align-items: center;
          gap: var(--space-2-5);
          padding: var(--space-2-5) 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover,
          &.active {
            background: #f0fdf4;
          }

          &.active {
            box-shadow: inset 3px 0 0 var(--color-primary);
          }

          .command-item-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .command-item-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: var(--space-0-5);

            .command-item-name {
              font-size: 13px;
              font-weight: 600;
              color: var(--color-text-primary);
            }

            .command-item-desc {
              font-size: 11px;
              color: var(--color-text-placeholder);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }

          .command-item-shortcut {
            font-size: 11px;
            color: var(--color-text-placeholder);
            background: #f1f5f9;
            padding: var(--space-0-5) 8px;
            border-radius: 4px;
            font-weight: 500;
            flex-shrink: 0;
          }

          .command-item-category {
            font-size: 10px;
            font-weight: 500;
            padding: var(--space-0-5) var(--space-2);
            border-radius: 8px;
            flex-shrink: 0;
            white-space: nowrap;
          }
        }

        .command-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px;
          color: var(--color-text-placeholder);
          font-size: 13px;
        }
      }

      textarea {
        flex: 1;
        border: none;
        outline: none;
        resize: none;
        font-size: 14px;
        line-height: 1.5;
        max-height: 120px;
        min-height: 24px;
        background: transparent;
        font-family: inherit;
        color: var(--color-text-primary);

        &::placeholder {
          color: var(--color-text-placeholder);
        }
      }

      .input-actions {
        display: flex;
        align-items: center;
        gap: 8px;

        .model-selector {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          margin-right: 4px;

          .model-dropdown-wrap {
            position: relative;
          }

          .model-dropdown-trigger {
            display: flex;
            align-items: center;
            gap: var(--space-1-5);
            padding: 4px 8px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;

            &:hover {
              border-color: var(--color-primary);
              background: #f0fdf4;
            }

            .model-trigger-logo {
              width: 18px;
              height: 18px;
              object-fit: contain;
              border-radius: var(--radius-xs);
            }

            .model-trigger-fallback {
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 700;
              background: #f1f5f9;
              border-radius: var(--radius-xs);
              flex-shrink: 0;
            }

            .model-trigger-name {
              font-size: 12px;
              color: var(--color-text-primary);
              font-weight: 500;
            }
          }

          .model-dropdown-panel {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 0;
            min-width: 220px;
            max-height: 320px;
            overflow-y: auto;
            background: white;
            border: 1px solid var(--color-border);
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
            z-index: 100;
            padding: var(--space-1-5);

            &::-webkit-scrollbar {
              width: 4px;
            }

            &::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: var(--radius-2xs);
            }
          }

          .model-dropdown-loading {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 16px 12px;
            color: var(--color-text-placeholder);
            font-size: 13px;
            justify-content: center;

            .spin-icon {
              animation: spin 1s linear infinite;
            }

            @keyframes spin {
              from {
                transform: rotate(0deg);
              }

              to {
                transform: rotate(360deg);
              }
            }
          }

          .model-dropdown-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-1-5);
            padding: 12px;
            color: var(--color-text-placeholder);
            font-size: 12px;
            text-align: center;

            .model-retry-btn {
              margin-top: 4px;
              padding: 4px 12px;
              border: 1px solid var(--color-border);
              border-radius: 6px;
              background: white;
              color: var(--color-text-secondary);
              font-size: 12px;
              cursor: pointer;
              transition: all 0.2s;

              &:hover {
                background: #f1f5f9;
                color: var(--color-primary);
                border-color: var(--color-primary);
              }
            }
          }

          .model-dropdown-item {
            display: flex;
            align-items: center;
            gap: var(--space-2-5);
            padding: var(--space-2-5) 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;

            &:hover {
              background: #f1f5f9;
            }

            &.active {
              background: #ecfdf5;
            }

            .model-item-logo-wrap {
              position: relative;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              border-radius: 4px;
              background: var(--color-bg-page);
              overflow: hidden;

              .model-item-logo {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }

              .model-item-fallback {
                display: none;
                position: absolute;
                inset: 0;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 700;
                background: #f1f5f9;
                border-radius: 4px;
              }
            }

            .model-item-name {
              flex: 1;
              font-size: 12px;
              color: var(--color-text-primary);
              font-weight: 500;
            }

            .model-item-check {
              color: var(--color-primary);
              display: flex;
              align-items: center;
            }
          }
        }

        .action-circle-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          position: relative;

          &:hover {
            background: #f1f5f9;
            color: var(--color-primary);
          }
        }

        .attach-btn {
          input[type="file"] {
            position: absolute;
            inset: 0;
            opacity: 0;
            cursor: pointer;
          }
        }

        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover:not(:disabled) {
            transform: scale(1.08);
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          }

          &:active:not(:disabled) {
            transform: scale(0.95);
          }

          &:disabled {
            background: #cbd5e1;
            cursor: not-allowed;
            opacity: 0.6;
          }
        }
      }
    }

    .input-hint {
      margin-top: 8px;
      text-align: center;
      font-size: 11px;
      color: var(--color-text-placeholder);
    }
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {

  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.command-fade-enter-active,
.command-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.command-fade-enter-from,
.command-fade-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

// ════════════════════════════════════════
// Phase 5: 响应式设计 + 性能优化
// ════════════════════════════════════════
@media (max-width: 1400px) {
  .dashboard-layout {
    grid-template-columns: 1fr 220px;
    gap: 16px;
  }
}

@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: 1fr 200px;
    gap: 12px;
  }

  .layout-left .cards-grid {
    grid-template-columns: 1fr 1fr;
  }

  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 992px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
    gap: 12px;
    height: auto;
  }

  .layout-left,
  .layout-main {
    position: static;
    max-height: none;
  }

  .ai-dashboard {
    height: auto;
  }

  .layout-left .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .layout-left,
  .layout-main {
    order: unset;
  }

  .ai-chat-section {
    min-height: 0; // 响应式模式下也移除固定高度
  }

  .global-error-toast {
    left: 12px;
    right: 12px;
    max-width: none;
    top: 12px;
  }
}

@media (max-width: 480px) {
  .layout-left .cards-grid {
    grid-template-columns: 1fr !important;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr !important;
  }

  .chat-input-bar {
    flex-direction: column;

    .input-wrapper {
      width: 100%;
    }

    .input-actions {
      width: 100%;
      justify-content: center;
      margin-top: 8px;
    }
  }
}

// ════════════════════════════════════════
// Phase 5: 无障碍性增强 (a11y)
// ════════════════════════════════════════

// 高对比度模式支持
@media (prefers-contrast: high) {
  .ai-dashboard {
    border: 2px solid #000;
  }

  .data-card,
  .chat-section {
    border-width: 2px;
  }
}

// 减少动画模式（尊重用户偏好）
@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// 焦点可见性（键盘导航）
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
}

// 屏幕阅读器专用文本（视觉隐藏但可读）
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// 性能优化：使用 GPU 加速
.data-card,
.chat-message,
.action-btn,
.quick-tag {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// 滚动性能优化
.messages-container {
  scroll-behavior: smooth;
  overscroll-behavior: contain;

  // 使用 passive 事件监听器提升滚动性能
  &::-webkit-scrollbar {
    width: 6px;

    &-thumb {
      background: rgba(148, 163, 184, 0.5);
      border-radius: var(--radius-xs);

      &:hover {
        background: rgba(148, 163, 184, 0.8);
      }
    }
  }
}

// ════════════════════════════════════════
// 区域4: 底部活动区
// ════════════════════════════════════════
.activity-footer {
  border-radius: 16px;
  padding: 20px;
  border: 2px solid #bae6fd;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .clear-btn,
    .view-all {
      font-size: 12px;
      color: var(--color-text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: none;

      &:hover {
        color: var(--color-primary);
      }
    }
  }
}

.visit-item {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  padding: var(--space-2-5) 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;

  &:hover {
    background: var(--color-bg-page);
    transform: translateX(4px);
  }

  .visit-title {
    flex: 1;
    font-size: 14px;
    color: var(--color-text-primary);
  }

  .visit-time {
    font-size: 12px;
    color: var(--color-text-placeholder);
  }
}

.task-item {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  padding: 12px;
  border-radius: 10px;
  margin-bottom: var(--space-1-5);
  border-left: 3px solid var(--color-border);
  transition: all 0.2s;

  &.type-approval {
    border-left-color: var(--color-warning);
  }

  &.type-action {
    border-left-color: #3b82f6;
  }

  &.type-reminder {
    border-left-color: #6b7280;
  }

  &:hover {
    background: var(--color-bg-page);
  }

  .check-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid #d1d5db;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    color: white;

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-primary);
    }

    .check-circle {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #d1d5db;
    }
  }

  .task-content {
    flex: 1;

    .task-title {
      font-size: 14px;
      color: var(--color-text-primary);
      font-weight: 500;
      display: block;
      margin-bottom: var(--space-0-5);
    }

    .task-meta {
      font-size: 12px;
      color: var(--color-text-placeholder);
    }
  }

  .go-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: #f1f5f9;
    cursor: pointer;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: var(--color-primary);
      color: white;
    }
  }
}

.empty-state,
.loading-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-placeholder);
  font-size: 14px;
}

// ════════════════════════════════════════
// 全局响应式
// ════════════════════════════════════════
@media (max-width: 480px) {
  .layout-left .cards-grid {
    grid-template-columns: 1fr !important;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr !important;
  }
}

// ════════════════════════════════════════
// 智能填单/导入模态框
// ════════════════════════════════════════
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafbfc;
  border-radius: 16px 16px 0 0;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  font-size: 20px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;

  &:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

// 模态框动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

<!-- 全局样式重置：强制移除父容器间距 -->
<style lang="scss">
body:has(.ai-dashboard) {

  .right-content.no-padding {
    padding: var(--space-3-5) 20px !important;
    margin: 0 !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  .content-body,
  .content-main,
  #main-content {
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    flex: 1 !important;
    min-height: 0 !important;
    max-height: none !important;
  }

  .ai-dashboard {
    padding: 0 !important;
    height: 100% !important;
    box-sizing: border-box !important;
  }
}

.role-config-modal {
  width: 460px;
  max-width: 90vw;

  .modal-body {
    padding: 20px 24px;
  }

  .form-group {
    margin-bottom: var(--space-4-5);

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: var(--space-1-5);
    }

    input[type="text"],
    select,
    textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      color: var(--color-text-primary);
      background: #fff;
      transition: border-color 0.2s;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #4b6bfb;
        box-shadow: 0 0 0 3px rgba(75, 107, 251, 0.1);
      }

      &::placeholder {
        color: var(--color-text-placeholder);
      }
    }

    textarea {
      resize: vertical;
      min-height: 60px;
    }

    select {
      cursor: pointer;
    }

    .form-hint {
      display: block;
      font-size: 12px;
      color: var(--color-text-placeholder);
      margin-top: 4px;
    }

    .optional-tag {
      font-size: 11px;
      color: var(--color-text-placeholder);
      font-weight: 400;
    }
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2-5);
    padding: 16px 24px;
    border-top: 1px solid var(--color-border);

    .btn-cancel {
      padding: 8px 20px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #fff;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;

      &:hover {
        background: var(--color-bg-page);
      }
    }

    .btn-confirm {
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      background: #4b6bfb;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;

      &:hover {
        background: #3b5bdb;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}
</style>