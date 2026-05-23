<template>
  <div class="chat-messages" ref="scrollContainer" @scroll="handleScroll">
    <div v-if="messages.length === 0" class="empty-hint">
      <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
        <path d="M14 22L10 4L26 16Z" fill="var(--color-primary-lighter)" />
        <path d="M46 22L50 4L34 16Z" fill="var(--color-primary-lighter)" />
        <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
        <path d="M27 38Q30 42 33 38" stroke="var(--color-primary-dark)" stroke-width="1" fill="none" stroke-linecap="round" />
        <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
        <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
      </svg>
      <p>描述你要填写的内容，我来帮你解析</p>
    </div>

    <div v-for="msg in messages" :key="msg.id" class="message-row" :class="`message-row--${msg.role}`">
      <div v-if="msg.role === 'assistant'" class="avatar-mini">
        <svg viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
          <path d="M14 22L10 4L26 16Z" fill="var(--color-primary-lighter)" />
          <path d="M46 22L50 4L34 16Z" fill="var(--color-primary-lighter)" />
          <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
          <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
          <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
          <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
          <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
          <path d="M27 38Q30 42 33 38" stroke="var(--color-primary-dark)" stroke-width="1" fill="none" stroke-linecap="round" />
          <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
          <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
        </svg>
      </div>

      <div class="message-content-wrap" :class="`message-content-wrap--${msg.role}`">
        <div class="message-bubble" :class="`message-bubble--${msg.role}`">
          <div v-if="!isCardType(msg.displayType) && msg.content" class="bubble-text markdown-content"
            v-html="renderMarkdown(msg.content)"></div>

          <CompareCard v-if="msg.displayType === 'compare' && msg.toolData" :data="msg.toolData" />
          <QuotationCard v-if="msg.displayType === 'quotation' && msg.toolData" :data="msg.toolData" />
          <SubstituteCard v-if="msg.displayType === 'substitute' && msg.toolData" :data="msg.toolData" />

          <div v-if="msg.fields && Object.keys(msg.fields).length > 0" class="parsed-fields">
            <div class="fields-header">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 4l4 4-4 4M8 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              <span>已解析字段</span>
            </div>
            <div class="fields-grid">
              <div v-for="(value, key) in msg.fields" :key="key" class="field-chip">
                <span class="field-key">{{ fieldLabelMap[key] || key }}</span>
                <span class="field-val">{{ value }}</span>
              </div>
            </div>
            <button class="fill-btn" @click="$emit('fill', msg.fields)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 8h8M8 4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              回填到表单
            </button>
          </div>

          <div v-if="msg.missingFields && msg.missingFields.length > 0" class="missing-fields">
            <span class="missing-label">还需提供：</span>
            <span v-for="f in msg.missingFields" :key="f" class="missing-tag">{{ fieldLabelMap[f] || f }}</span>
          </div>

          <div
            v-if="msg.role === 'assistant' && msg.metadata && (msg.metadata.model || msg.metadata.latency || msg.metadata.tokenUsage)"
            class="message-meta">
            <template v-if="msg.metadata.model">
              <span class="meta-model">{{ msg.metadata.model }}</span>
            </template>
            <template v-if="msg.metadata.latency && msg.metadata.latency > 0">
              <span v-if="msg.metadata.model" class="meta-sep">·</span>
              <span class="meta-latency">{{ msg.metadata.latency < 1000 ? msg.metadata.latency + 'ms' :
                (msg.metadata.latency / 1000).toFixed(1) + 's' }}</span>
            </template>
            <template v-if="msg.metadata.tokenUsage && msg.metadata.tokenUsage.total_tokens > 0">
              <span class="meta-sep">·</span>
              <span class="token-usage"
                :title="`输入: ${msg.metadata.tokenUsage.prompt_tokens || 0} / 输出: ${msg.metadata.tokenUsage.completion_tokens || 0}`">Token：{{
                  msg.metadata.tokenUsage.total_tokens }}</span>
            </template>
          </div>
        </div>

        <div v-if="msg.role === 'user'" class="message-action-icons message-action-icons--user">
          <button class="msg-icon-btn" @click="copyContent(msg.content)" title="复制">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
              <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </button>
          <button class="msg-icon-btn" @click="handleDelete(msg.id)" title="删除">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div v-if="msg.role === 'assistant'" class="message-action-icons">
          <button class="msg-icon-btn" @click="copyContent(msg.content)" title="复制">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
              <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </button>
          <button class="msg-icon-btn" @click="handleRetry(msg)" title="重试">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 8a5.5 5.5 0 019.3-3.95M13.5 8a5.5 5.5 0 01-9.3 3.95" stroke="currentColor"
                stroke-width="1.2" stroke-linecap="round" />
              <path d="M11 1.5v3h3M5 14.5v-3H2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="msg.role === 'user'" class="avatar-mini avatar-mini--user">
        <img v-if="userAvatar" :src="userAvatar" alt="用户头像" class="avatar-img" />
        <img v-else src="/avatar-default.jpg" alt="默认头像" class="avatar-img" />
      </div>
    </div>

    <div v-if="loading" class="message-row message-row--assistant">
      <div class="avatar-mini">
        <svg viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
          <path d="M14 22L10 4L26 16Z" fill="var(--color-primary-lighter)" />
          <path d="M46 22L50 4L34 16Z" fill="var(--color-primary-lighter)" />
          <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
          <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
          <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
          <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
          <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
          <path d="M27 38Q30 42 33 38" stroke="var(--color-primary-dark)" stroke-width="1" fill="none" stroke-linecap="round" />
          <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
          <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
        </svg>
      </div>
      <div class="message-bubble message-bubble--assistant">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>

    <Transition name="scroll-btn-fade">
      <button v-if="showScrollBottom" class="scroll-bottom-btn" @click="scrollToBottomClick" title="回到底部">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
        <span v-if="loading" class="scroll-btn-pulse"></span>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import type { FloatMessage } from "@/stores/floatAgent";
import { useFloatAgentStore } from "@/stores/floatAgent";
import { useAuthStore } from "@/stores/auth";
import { marked } from "marked";
import CompareCard from "./CompareCard.vue";
import QuotationCard from "./QuotationCard.vue";
import SubstituteCard from "./SubstituteCard.vue";

const CARD_DISPLAY_TYPES = ["compare", "quotation", "substitute"];

function isCardType(displayType?: string): boolean {
  return !!displayType && CARD_DISPLAY_TYPES.includes(displayType);
}

function renderMarkdown(text: string): string {
  if (!text) return "";
  try {
    return marked.parse(text) as string;
  } catch {
    return text;
  }
}

const authStore = useAuthStore();
const floatStore = useFloatAgentStore();

const props = defineProps<{
  messages: FloatMessage[];
  loading: boolean;
  fieldLabelMap: Record<string, string>;
}>();

const _emit = defineEmits<{
  fill: [fields: Record<string, any>];
}>();

const userAvatar = computed(() => authStore.user?.avatar || "");

const scrollContainer = ref<HTMLElement | null>(null);
const showScrollBottom = ref(false);

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

function autoScrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      const isNearBottom =
        scrollContainer.value.scrollHeight -
        scrollContainer.value.scrollTop -
        scrollContainer.value.clientHeight < 300;
      if (isNearBottom) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
      }
    }
  });
}

function handleScroll() {
  if (!scrollContainer.value) return;
  const isNearBottom =
    scrollContainer.value.scrollHeight -
    scrollContainer.value.scrollTop -
    scrollContainer.value.clientHeight < 300;
  showScrollBottom.value = !isNearBottom;
}

function scrollToBottomClick() {
  scrollToBottom();
  showScrollBottom.value = false;
}

async function copyContent(content: string) {
  try {
    await navigator.clipboard.writeText(content);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function handleDelete(msgId: string) {
  floatStore.deleteMessage(msgId);
}

function handleRetry(msg: FloatMessage) {
  floatStore.retryMessage(msg);
}

watch(() => props.messages.length, autoScrollToBottom);
watch(() => props.loading, autoScrollToBottom);
</script>

<style scoped lang="scss">
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: var(--radius-2xs);
  }
}

.empty-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: $text-secondary;
  font-size: $font-size-body-sm;

  svg {
    opacity: 0.5;
    animation: catBounce 4s ease-in-out infinite;
  }
}

@keyframes catBounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

.message-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;

  &--user {
    justify-content: flex-end;
  }

  &:hover .message-action-icons {
    opacity: 1;
  }
}

.avatar-mini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  background: $brand-primary-bg;
  overflow: hidden;

  svg {
    width: 100%;
    height: 100%;
  }

  &--user {
    background: $color-lavender;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
}

.message-content-wrap {
  display: flex;
  flex-direction: column;
  max-width: 75%;

  &--user {
    align-items: flex-end;
  }
}

.message-bubble {
  padding: var(--space-2-5) var(--space-3-5);
  border-radius: 12px;
  font-size: $font-size-body-sm;
  line-height: $line-height-normal;
  word-break: break-word;

  &--user {
    background: $gradient-brand;
    color: $text-white;
    border-bottom-right-radius: 4px;
  }

  &--assistant {
    background: $bg-container-alt;
    color: $text-primary;
    border: 1px solid $border-color-light;
    border-bottom-left-radius: 4px;
  }
}

.markdown-content {
  line-height: 1.6;

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    color: $text-primary;
    margin-top: var(--space-2-5);
    margin-bottom: var(--space-1-5);
    font-size: 14px;
  }

  :deep(p) {
    margin-bottom: var(--space-1-5);
  }

  :deep(code) {
    background: var(--color-border);
    padding: 1px var(--space-1-25);
    border-radius: 4px;
    font-family: "Monaco", monospace;
    font-size: 12px;
  }

  :deep(pre) {
    background: var(--color-text-primary);
    color: var(--color-border);
    padding: var(--space-2-5);
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;

    code {
      background: transparent;
      color: inherit;
    }
  }

  :deep(ul),
  :deep(ol) {
    padding-left: var(--space-4-5);
    margin-bottom: var(--space-1-5);
  }

  :deep(li) {
    margin-bottom: var(--space-1);
  }

  :deep(strong) {
    font-weight: 600;
    color: $text-primary;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 12px;

    th,
    td {
      padding: var(--space-1-25) 8px;
      border: 1px solid $border-color-light;
      text-align: left;
    }

    th {
      background: $bg-page;
      font-weight: 600;
      color: $text-secondary;
    }

    td {
      color: $text-primary;
    }

    tr:nth-child(even) td {
      background: rgba(0, 0, 0, 0.02);
    }
  }

  :deep(blockquote) {
    border-left: 3px solid $brand-primary;
    padding-left: var(--space-2-5);
    margin: var(--space-1-5) 0;
    color: $text-secondary;
  }
}

.message-action-icons {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  padding-left: 4px;
  opacity: 0;
  transition: opacity 0.2s;

  &--user {
    padding-left: 0;
    padding-right: 4px;
    justify-content: flex-end;
  }
}

.msg-icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: $text-tertiary;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: $bg-page;
    color: $brand-emerald;
  }

  &:active {
    transform: scale(0.92);
  }
}

.message-meta {
  margin-top: 8px;
  padding-top: var(--space-1-5);
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  font-size: 11px;
  color: var(--color-text-placeholder);
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;

  .meta-model {
    background: #f1f5f9;
    color: var(--color-text-secondary);
    padding: 1px var(--space-1-5);
    border-radius: 4px;
    font-weight: 500;
  }

  .meta-sep {
    color: #cbd5e1;
  }

  .meta-latency {
    color: var(--color-text-secondary);
  }

  .token-usage {
    color: #6366f1;
    font-weight: 500;
  }
}

.parsed-fields {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed $border-color;
}

.fields-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: $font-size-caption;
  color: $brand-primary;
  font-weight: $font-weight-medium;
  margin-bottom: var(--space-1-5);
}

.fields-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5);
}

.field-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-1) 8px;
  border-radius: 6px;
  background: $brand-primary-bg;
  font-size: $font-size-micro;

  .field-key {
    color: $text-secondary;
  }

  .field-val {
    color: $text-primary;
    font-weight: $font-weight-medium;
  }
}

.fill-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: var(--space-1-25) 12px;
  border-radius: 8px;
  border: 1px solid $brand-primary;
  background: transparent;
  color: $brand-primary;
  font-size: $font-size-caption;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: $brand-primary;
    color: $text-white;
  }
}

.missing-fields {
  margin-top: var(--space-1-5);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;

  .missing-label {
    font-size: $font-size-micro;
    color: $color-warning;
  }

  .missing-tag {
    font-size: $font-size-micro;
    padding: var(--space-0-5) var(--space-1-5);
    border-radius: 4px;
    background: rgba(240, 160, 64, 0.1);
    color: $color-warning;
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $brand-primary-light;
    animation: typing-bounce 1.2s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.15s;
    }

    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
}

@keyframes typing-bounce {

  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

.scroll-bottom-btn {
  position: absolute;
  bottom: 12px;
  right: 16px;
  width: 36px;
  height: 36px;
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
    background: $brand-emerald;
    color: white;
    border-color: $brand-emerald;
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
    background: $brand-emerald;
    animation: scroll-pulse 1.5s ease-in-out infinite;
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

@keyframes scroll-pulse {
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
</style>
