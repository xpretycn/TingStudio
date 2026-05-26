<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { MessagePlugin } from "tdesign-vue-next"
import { formulaTemplateApi } from "@/api/formulaTemplate"
import { useQuickFormulaStore } from "@/stores/quickFormula"
import { formatDate } from "@/utils/timeFormat"
import type { FormulaTemplate } from "@/types/quickFormula"

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  load: [data: FormulaTemplate]
}>()

const quickFormulaStore = useQuickFormulaStore()

const templates = ref<FormulaTemplate[]>([])
const loading = ref(false)
const searchKeyword = ref("")
const templateName = ref("")
const templateDesc = ref("")
const saving = ref(false)

const filteredTemplates = computed(() => {
  if (!searchKeyword.value.trim()) return templates.value
  const kw = searchKeyword.value.trim().toLowerCase()
  return templates.value.filter((t) => t.name.toLowerCase().includes(kw))
})

async function fetchTemplates() {
  loading.value = true
  try {
    const res = await formulaTemplateApi.getList()
    templates.value = res.list || []
  } catch {
    templates.value = []
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  const name = templateName.value.trim()
  if (!name) {
    MessagePlugin.warning("请输入模板名称")
    return
  }

  saving.value = true
  try {
    await formulaTemplateApi.create({
      name,
      description: templateDesc.value.trim() || null,
      ratioFactor: quickFormulaStore.formulaData.ratioFactor,
      supplementRatioFactor: quickFormulaStore.formulaData.supplementRatioFactor,
      finishedWeight: quickFormulaStore.formulaData.finishedWeight,
      packagingPrice: quickFormulaStore.formulaData.packagingPrice,
      otherPrice: quickFormulaStore.formulaData.otherPrice,
      profitMargin: quickFormulaStore.formulaData.profitMargin,
      materials: quickFormulaStore.formulaData.materials.map((m) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        quantity: m.quantity,
        materialType: m.materialType,
      })),
    })
    MessagePlugin.success("模板保存成功")
    templateName.value = ""
    templateDesc.value = ""
    await fetchTemplates()
  } catch {
    MessagePlugin.error("模板保存失败")
  } finally {
    saving.value = false
  }
}

function handleLoad(template: FormulaTemplate) {
  emit("load", template)
  emit("close")
}

async function handleDelete(id: string) {
  try {
    await formulaTemplateApi.delete(id)
    MessagePlugin.success("模板已删除")
    await fetchTemplates()
  } catch {
    MessagePlugin.error("删除失败")
  }
}

function handleClose() {
  emit("close")
}

onMounted(() => {
  if (props.visible) {
    fetchTemplates()
  }
})
</script>

<template>
  <t-dialog
    :visible="visible"
    header="模板管理"
    :footer="false"
    width="680px"
    :close-on-overlay-click="true"
    @close="handleClose"
  >
    <div class="template-manager">
      <div class="tm-section">
        <h4 class="tm-section-title">保存为模板</h4>
        <div class="tm-save-form">
          <t-input
            v-model="templateName"
            placeholder="模板名称（必填）"
            size="small"
            clearable
            :maxlength="50"
          />
          <t-textarea
            v-model="templateDesc"
            placeholder="模板描述（选填）"
            size="small"
            :maxlength="200"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
          <t-button
            theme="default"
            size="small"
            class="btn-emerald-fill"
            :loading="saving"
            :disabled="!templateName.trim()"
            @click="handleSave"
          >
            <template #icon><t-icon name="save" /></template>
            保存
          </t-button>
        </div>
      </div>

      <div class="tm-section">
        <div class="tm-section-header">
          <h4 class="tm-section-title">已保存模板</h4>
          <t-input
            v-model="searchKeyword"
            placeholder="搜索模板"
            size="small"
            clearable
            class="tm-search"
          >
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
        </div>

        <div class="tm-list">
          <t-loading :loading="loading" size="small">
            <template v-if="filteredTemplates.length > 0">
              <div
                v-for="tpl in filteredTemplates"
                :key="tpl.id"
                class="tm-item"
              >
                <div class="tm-item-body">
                  <div class="tm-item-name">
                    {{ tpl.name }}
                    <t-tag
                      v-if="tpl.materials?.length"
                      size="small"
                      theme="success"
                      variant="light"
                    >
                      {{ tpl.materials.length }} 种原料
                    </t-tag>
                  </div>
                  <div class="tm-item-meta">
                    <span v-if="tpl.description" class="tm-item-desc">{{ tpl.description }}</span>
                    <span class="tm-item-date">{{ formatDate(tpl.createdAt) }}</span>
                  </div>
                </div>
                <div class="tm-item-actions">
                  <t-button size="small" variant="outline" @click="handleLoad(tpl)">
                    <template #icon><t-icon name="download" /></template>
                    加载
                  </t-button>
                  <t-popconfirm content="确认删除该模板？" @confirm="handleDelete(tpl.id)">
                    <t-button size="small" variant="text" theme="danger">
                      <template #icon><t-icon name="delete" /></template>
                      删除
                    </t-button>
                  </t-popconfirm>
                </div>
              </div>
            </template>
            <div v-else class="tm-empty">
              <t-icon name="folder" size="28px" />
              <span>暂无模板</span>
            </div>
          </t-loading>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.template-manager {
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.tm-section {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.tm-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
}

.tm-section-title {
  font-size: $font-size-h4;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  margin: 0;
  flex-shrink: 0;
}

.tm-search {
  width: 200px;
}

.tm-save-form {
  display: flex;
  flex-direction: column;
  gap: $space-2-5;
  padding: $space-4;
  background: $bg-page;
  border-radius: $radius-xl;
  border: 1px solid $border-color-light;
}

.tm-list {
  min-height: 120px;
}

.tm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-3-5 $space-4;
  border-radius: $radius-lg;
  border: 1px solid $border-color-light;
  transition: all $transition-fast;

  & + & {
    margin-top: $space-2;
  }

  &:hover {
    background: $bg-hover;
    border-color: $border-color;
  }
}

.tm-item-body {
  flex: 1;
  min-width: 0;
}

.tm-item-name {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.tm-item-meta {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-top: $space-1;
}

.tm-item-desc {
  font-size: $font-size-caption;
  color: $text-tertiary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

.tm-item-date {
  font-size: $font-size-micro;
  color: $text-placeholder;
  flex-shrink: 0;
}

.tm-item-actions {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  flex-shrink: 0;
}

.tm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: $space-8 $space-4;
  color: $text-placeholder;

  span {
    font-size: $font-size-body-sm;
    color: $text-tertiary;
  }
}

.btn-emerald-fill {
  background-color: $emerald-500 !important;
  color: $text-white !important;
  border-color: $emerald-500 !important;

  &:hover {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }

  &:active {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }

  &:disabled {
    background-color: $text-placeholder !important;
    border-color: $text-placeholder !important;
    cursor: not-allowed;
  }
}
</style>
