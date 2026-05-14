<template>
  <div class="chat-messages" ref="scrollContainer">
    <div v-if="messages.length === 0" class="empty-hint">
      <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
        <path d="M14 22L10 4L26 16Z" fill="#FFB5C8" />
        <path d="M46 22L50 4L34 16Z" fill="#FFB5C8" />
        <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
        <path d="M27 38Q30 42 33 38" stroke="#E8A0B0" stroke-width="1" fill="none" stroke-linecap="round" />
      </svg>
      <p>描述你要填写的内容，我来帮你解析</p>
    </div>

    <div v-for="msg in messages" :key="msg.id" class="message-row" :class="`message-row--${msg.role}`">
      <div v-if="msg.role === 'assistant'" class="avatar-mini">
        <svg viewBox="0 0 60 60" fill="none"><circle cx="30" cy="32" r="20" fill="#FFE8D6"/><ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60"/><ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60"/></svg>
      </div>

      <div class="message-bubble" :class="`message-bubble--${msg.role}`">
        <div class="bubble-text">{{ msg.content }}</div>

          <CompareCard v-if="msg.displayType === 'compare' && msg.toolData" :data="msg.toolData" />
          <QuotationCard v-if="msg.displayType === 'quotation' && msg.toolData" :data="msg.toolData" />
          <SubstituteCard v-if="msg.displayType === 'substitute' && msg.toolData" :data="msg.toolData" />

        <div v-if="msg.fields && Object.keys(msg.fields).length > 0" class="parsed-fields">
          <div class="fields-header">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4l4 4-4 4M8 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>已解析字段</span>
          </div>
          <div class="fields-grid">
            <div v-for="(value, key) in msg.fields" :key="key" class="field-chip">
              <span class="field-key">{{ fieldLabelMap[key] || key }}</span>
              <span class="field-val">{{ value }}</span>
            </div>
          </div>
          <button class="fill-btn" @click="$emit('fill', msg.fields)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M8 4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            回填到表单
          </button>
        </div>

        <div v-if="msg.missingFields && msg.missingFields.length > 0" class="missing-fields">
          <span class="missing-label">还需提供：</span>
          <span v-for="f in msg.missingFields" :key="f" class="missing-tag">{{ fieldLabelMap[f] || f }}</span>
        </div>
      </div>

      <div v-if="msg.role === 'user'" class="avatar-mini avatar-mini--user">
        <img v-if="userAvatar" :src="userAvatar" alt="用户头像" class="avatar-img" />
        <img v-else src="/avatar-default.jpg" alt="默认头像" class="avatar-img" />
      </div>
    </div>

    <div v-if="loading" class="message-row message-row--assistant">
      <div class="avatar-mini">
        <svg viewBox="0 0 60 60" fill="none"><circle cx="30" cy="32" r="20" fill="#FFE8D6"/><ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60"/><ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60"/></svg>
      </div>
      <div class="message-bubble message-bubble--assistant">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import type { FloatMessage } from "@/stores/floatAgent";
import { useAuthStore } from "@/stores/auth";
import CompareCard from "./CompareCard.vue";
import QuotationCard from "./QuotationCard.vue";
import SubstituteCard from "./SubstituteCard.vue";

const authStore = useAuthStore();

const props = defineProps<{
  messages: FloatMessage[];
  loading: boolean;
  fieldLabelMap: Record<string, string>;
}>();

const userAvatar = computed(() => authStore.user?.avatar || "");

defineEmits<{
  fill: [fields: Record<string, any>];
}>();

const scrollContainer = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

watch(() => props.messages.length, scrollToBottom);
watch(() => props.loading, scrollToBottom);
</script>

<style scoped lang="scss">
@use "@/assets/styles/design-tokens" as *;

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: 2px;
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
  }
}

.message-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;

  &--user {
    justify-content: flex-end;
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

.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
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
  margin-bottom: 6px;
}

.fields-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.field-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
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
  padding: 5px 12px;
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
  margin-top: 6px;
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
    padding: 2px 6px;
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

    &:nth-child(2) { animation-delay: 0.15s; }
    &:nth-child(3) { animation-delay: 0.3s; }
  }
}

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}
</style>
