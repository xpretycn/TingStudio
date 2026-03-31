<template>
  <div class="nutrition-profiles">
    <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="5" />
    <t-card v-else class="content-card" bordered>
      <template #actions>
        <t-button theme="primary" size="large" @click="showDialog = true; resetForm()">
          <template #icon><t-icon name="add" /></template>新增营养标准
        </t-button>
      </template>

      <t-form :data="filterForm" layout="inline" @submit="handleFilter" style="margin-bottom: 16px;">
        <t-form-item label="类别">
          <t-select v-model="filterForm.category" placeholder="全部" clearable style="width: 160px">
            <t-option value="infant" label="婴幼儿" />
            <t-option value="child" label="儿童" />
            <t-option value="adult" label="成人" />
            <t-option value="elderly" label="老年" />
            <t-option value="pregnant" label="孕妇" />
            <t-option value="special" label="特殊" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" type="submit" size="small">
            <template #icon><t-icon name="search" /></template>筛选
          </t-button>
          <t-button theme="default" size="small" @click="handleResetFilter">
            <template #icon><t-icon name="refresh" /></template>重置
          </t-button>
        </t-form-item>
      </t-form>

      <t-table
        :data="nutritionStore.profiles"
        :columns="columns"
        :loading="nutritionStore.loading"
        row-key="profileId"
        hover
        stripe
        table-layout="auto"
      >
        <template #empty><t-empty description="暂无营养标准" /></template>
        <template #category="{ row }">
          <t-tag :theme="categoryTheme(row.category)" variant="light">{{ categoryLabel(row.category) }}</t-tag>
        </template>
        <template #targetCount="{ row }">
          <t-tag theme="primary" variant="light">{{ Object.keys(row.targetValues || {}).length }} 项指标</t-tag>
        </template>
        <template #isPreset="{ row }">
          <t-tag v-if="row.isPreset" theme="warning" variant="light" size="small">预置</t-tag>
          <span v-else>-</span>
        </template>
        <template #operation="{ row }">
          <t-space>
            <t-button variant="text" theme="primary" size="small" @click="handleViewDetail(row)">
              <template #icon><t-icon name="browse" /></template>详情
            </t-button>
            <t-button variant="text" theme="success" size="small" @click="handleEdit(row)" :disabled="row.isPreset">
              <template #icon><t-icon name="edit" /></template>编辑
            </t-button>
            <t-button variant="text" theme="danger" size="small" @click="handleDelete(row)" :disabled="row.isPreset">
              <template #icon><t-icon name="delete" /></template>删除
            </t-button>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新增营养标准弹窗 -->
    <t-dialog v-model:visible="showDialog" :header="isEditMode ? '编辑营养标准' : '新增营养标准'" width="600px" @confirm="handleSave">
      <t-form :data="profileForm" label-width="100px">
        <t-form-item label="标准名称">
          <t-input v-model="profileForm.name" placeholder="例如：GB 10765 婴幼儿配方" />
        </t-form-item>
        <t-form-item label="适用类别">
          <t-select v-model="profileForm.category">
            <t-option value="infant" label="婴幼儿" />
            <t-option value="child" label="儿童" />
            <t-option value="adult" label="成人" />
            <t-option value="elderly" label="老年" />
            <t-option value="pregnant" label="孕妇" />
            <t-option value="special" label="特殊" />
          </t-select>
        </t-form-item>
        <t-form-item label="描述">
          <t-textarea v-model="profileForm.description" placeholder="可选描述" />
        </t-form-item>
        <t-form-item label="营养指标">
          <div class="target-values-editor">
            <div v-for="(val, key) in profileForm.targetValues" :key="key" class="target-row">
              <t-input :value="key" @change="(v: string) => updateTargetKey(key, v)" placeholder="指标名" style="width: 160px" />
              <t-input-number :value="val" @change="(v: number) => updateTargetVal(key, v)" placeholder="值" style="width: 140px" />
              <t-button variant="text" theme="danger" size="small" @click="removeTarget(key as string)">
                <template #icon><t-icon name="delete" /></template>
              </t-button>
            </div>
            <t-button variant="dashed" size="small" @click="addTarget" style="width: 100%;">
              <template #icon><t-icon name="add" /></template>添加指标
            </t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 详情弹窗 -->
    <t-dialog v-model:visible="detailVisible" :header="currentProfile?.name" width="600px" :footer="false">
      <div v-if="currentProfile">
        <t-descriptions :column="2" bordered>
          <t-descriptions-item label="标准名称">{{ currentProfile.name }}</t-descriptions-item>
          <t-descriptions-item label="适用类别">{{ categoryLabel(currentProfile.category) }}</t-descriptions-item>
          <t-descriptions-item label="描述" :span="2">{{ currentProfile.description || '无' }}</t-descriptions-item>
        </t-descriptions>
        <div class="detail-targets">
          <h4>营养指标值</h4>
          <t-table
            :data="profileTargetList"
            :columns="targetDetailColumns"
            size="small"
            bordered
            stripe
          />
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useNutritionStore } from '@/stores/nutrition'
import { MessagePlugin, Dialog } from 'tdesign-vue-next'
import type { NutritionProfile } from '@/api/nutrition'
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const nutritionStore = useNutritionStore()

const initialized = ref(false)

const filterForm = reactive({ category: '' })
const showDialog = ref(false)
const detailVisible = ref(false)
const isEditMode = ref(false)
const editingProfileId = ref('')
const currentProfile = ref<NutritionProfile | null>(null)

const profileForm = reactive({
  name: '',
  category: 'adult' as string,
  description: '',
  targetValues: {} as Record<string, number>
})

const categoryMap: Record<string, string> = {
  infant: '婴幼儿', child: '儿童', adult: '成人', elderly: '老年', pregnant: '孕妇', special: '特殊'
}
const categoryLabel = (c: string) => categoryMap[c] || c
const categoryTheme = (c: string) => c === 'infant' ? 'warning' : c === 'adult' ? 'primary' : 'success'

const columns = [
  { colKey: 'name', title: '标准名称', width: 200 },
  { colKey: 'category', title: '适用类别', width: 120 },
  { colKey: 'isPreset', title: '预置', width: 80 },
  { colKey: 'targetCount', title: '指标数量', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 240 }
]

const targetDetailColumns = [
  { colKey: 'nutrient', title: '营养成分', width: 200 },
  { colKey: 'value', title: '标准值' }
]

const profileTargetList = computed(() => {
  if (!currentProfile.value?.targetValues) return []
  return Object.entries(currentProfile.value.targetValues).map(([k, v]) => ({
    nutrient: k,
    value: v
  }))
})

const resetForm = () => {
  profileForm.name = ''
  profileForm.category = 'adult'
  profileForm.description = ''
  profileForm.targetValues = {}
}

const addTarget = () => {
  profileForm.targetValues[`指标${Object.keys(profileForm.targetValues).length + 1}`] = 0
}

const updateTargetKey = (oldKey: string, newKey: string) => {
  if (oldKey === newKey) return
  const val = profileForm.targetValues[oldKey]
  delete profileForm.targetValues[oldKey]
  profileForm.targetValues[newKey] = val
}

const updateTargetVal = (key: string, val: number) => {
  profileForm.targetValues[key] = val
}

const removeTarget = (key: string) => {
  delete profileForm.targetValues[key]
}

const handleFilter = () => {
  nutritionStore.fetchProfiles(filterForm.category ? { category: filterForm.category } : undefined)
}

const handleResetFilter = () => {
  filterForm.category = ''
  nutritionStore.fetchProfiles()
}

const handleCreate = async () => {
  if (!profileForm.name) { MessagePlugin.warning('请输入标准名称'); return }
  if (!Object.keys(profileForm.targetValues).length) { MessagePlugin.warning('请至少添加一项营养指标'); return }
  const result = await nutritionStore.createProfile({
    name: profileForm.name,
    category: profileForm.category,
    description: profileForm.description || undefined,
    targetValues: profileForm.targetValues
  })
  if (result.success) {
    MessagePlugin.success('创建成功')
    showDialog.value = false
  } else {
    MessagePlugin.error(result.message || '创建失败')
  }
}

const handleEdit = (row: NutritionProfile) => {
  isEditMode.value = true
  editingProfileId.value = row.profileId
  profileForm.name = row.name
  profileForm.category = row.category
  profileForm.description = row.description || ''
  profileForm.targetValues = { ...row.targetValues }
  showDialog.value = true
}

const handleSave = async () => {
  if (!profileForm.name) { MessagePlugin.warning('请输入标准名称'); return }
  if (!Object.keys(profileForm.targetValues).length) { MessagePlugin.warning('请至少添加一项营养指标'); return }
  
  let result
  if (isEditMode.value && editingProfileId.value) {
    result = await nutritionStore.updateProfile(editingProfileId.value, {
      name: profileForm.name,
      category: profileForm.category,
      description: profileForm.description || undefined,
      targetValues: profileForm.targetValues
    })
  } else {
    result = await nutritionStore.createProfile({
      name: profileForm.name,
      category: profileForm.category,
      description: profileForm.description || undefined,
      targetValues: profileForm.targetValues
    })
  }
  
  if (result.success) {
    MessagePlugin.success(isEditMode.value ? '更新成功' : '创建成功')
    showDialog.value = false
  } else {
    MessagePlugin.error(result.message || (isEditMode.value ? '更新失败' : '创建失败'))
  }
}

const handleDelete = async (row: NutritionProfile) => {
  if (row.isPreset) {
    MessagePlugin.warning('预置营养标准不可删除')
    return
  }
  
  const confirmed = await Dialog.confirm({
    header: '确认删除',
    content: `确定要删除营养标准"${row.name}"吗？`,
    confirmBtn: { theme: 'danger', content: '确定' },
    cancelBtn: { theme: 'default', content: '取消' },
  })
  
  if (confirmed) {
    const result = await nutritionStore.deleteProfile(row.profileId)
    if (result.success) {
      MessagePlugin.success('删除成功')
    } else {
      MessagePlugin.error(result.message || '删除失败')
    }
  }
}

const handleViewDetail = (row: NutritionProfile) => {
  currentProfile.value = row
  detailVisible.value = true
}

onMounted(async () => {
  await nutritionStore.fetchProfiles()
  initialized.value = true
})
</script>

<style scoped lang="scss">
.nutrition-profiles {
  .content-card {
    min-height: 400px;
    box-shadow: $shadow-xs;
    &:hover { box-shadow: $shadow-md; }
  }
  .target-values-editor {
    width: 100%;
    .target-row {
      display: flex; align-items: center; gap: $space-2; margin-bottom: $space-2;
    }
  }
  .detail-targets {
    margin-top: $space-4;
    h4 {
      margin: 0 0 $space-3 0; font-size: 15px; font-weight: $font-weight-semibold; color: $text-primary;
      display: flex; align-items: center; gap: 6px;
      &::before {
        content: ''; display: inline-block; width: $space-1; height: $font-size-h3;
        background: $gradient-btn; border-radius: $radius-xs;
      }
    }
  }
  // 按钮和表格样式由全局 main.scss 统一覆盖
  :deep(.t-table) { .t-table__row--hover { background-color: $bg-hover; } }
}
</style>
