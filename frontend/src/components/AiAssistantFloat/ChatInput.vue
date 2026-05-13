<template>
  <div class="chat-input">
    <div class="input-wrapper">
      <textarea ref="textareaRef" v-model="text" :placeholder="placeholder" :disabled="disabled"
        rows="1" @keydown.enter.exact.prevent="handleSend" @input="autoResize" />
      <button class="send-btn" :disabled="disabled || !text.trim()" @click="handleSend">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M2 8l12-6-5 12-2-5-5-2z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <div class="input-hint">
      <span>Enter 发送 · Shift+Enter 换行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";

const props = withDefaults(defineProps<{
  disabled?: boolean;
  placeholder?: string;
}>(), {
  disabled: false,
  placeholder: "描述你要填写的内容…",
});

const emit = defineEmits<{
  send: [text: string];
}>();

const text = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function handleSend() {
  const val = text.value.trim();
  if (!val || props.disabled) return;
  emit("send", val);
  text.value = "";
  nextTick(autoResize);
}

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}
</script>

<style scoped lang="scss">
@use "@/assets/styles/design-tokens" as *;

.chat-input {
  padding: 12px 16px;
  border-top: 1px solid $border-color-light;
  background: $bg-container;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: $bg-page;
  border: 1px solid $border-color;
  border-radius: 12px;
  padding: 8px 8px 8px 14px;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: $brand-primary;
    box-shadow: 0 0 0 2px rgba(255, 107, 138, 0.1);
  }

  textarea {
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    font-size: $font-size-body-sm;
    line-height: $line-height-normal;
    color: $text-primary;
    font-family: $font-family;
    max-height: 120px;

    &::placeholder {
      color: $text-placeholder;
    }

    &:disabled {
      opacity: 0.5;
    }
  }
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: $gradient-btn;
  color: $text-white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: $gradient-btn-hover;
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.input-hint {
  margin-top: 4px;
  text-align: right;
  font-size: $font-size-micro;
  color: $text-placeholder;
}
</style>
