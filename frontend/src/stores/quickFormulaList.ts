import { defineStore } from 'pinia'
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import * as quickFormulaApi from '@/api/quickFormula'
import type { QuickFormulaItem, PublishData } from '@/types/quickFormula'

export const useQuickFormulaListStore = defineStore('quickFormulaList', () => {
  const list = ref<QuickFormulaItem[]>([])
  const loading = ref(false)
  const selectedId = ref<string | null>(null)

  async function fetchList() {
    loading.value = true
    try {
      const res = await quickFormulaApi.getQuickFormulaList({ pageSize: 100 }) as unknown as { list: QuickFormulaItem[] }
      list.value = res.list || []
    } catch {
      // HTTP 拦截器已自动提示
    } finally {
      loading.value = false
    }
  }

  async function createQuickFormula(name: string): Promise<QuickFormulaItem | null> {
    try {
      const res = await quickFormulaApi.createQuickFormula({ name }) as unknown as QuickFormulaItem
      MessagePlugin.success('快速配方创建成功')
      await fetchList()
      return res
    } catch {
      return null
    }
  }

  async function deleteQuickFormula(id: string): Promise<boolean> {
    try {
      await quickFormulaApi.deleteQuickFormula(id)
      MessagePlugin.success('删除成功')
      if (selectedId.value === id) {
        selectedId.value = null
      }
      await fetchList()
      return true
    } catch {
      return false
    }
  }

  async function saveQuickFormula(id: string, data: Record<string, unknown>): Promise<boolean> {
    try {
      await quickFormulaApi.updateQuickFormula(id, data)
      MessagePlugin.success('保存成功')
      await fetchList()
      return true
    } catch {
      return false
    }
  }

  async function publishQuickFormula(id: string, publishData: PublishData): Promise<{ formulaId: string; versionId: string } | null> {
    try {
      const res = await quickFormulaApi.publishQuickFormula(id, publishData) as unknown as { formulaId: string; versionId: string }
      MessagePlugin.success('发布成功')
      await fetchList()
      return res
    } catch {
      return null
    }
  }

  async function loadQuickFormula(id: string): Promise<QuickFormulaItem | null> {
    try {
      const res = await quickFormulaApi.getQuickFormulaById(id) as unknown as QuickFormulaItem
      selectedId.value = id
      return res
    } catch {
      return null
    }
  }

  return {
    list,
    loading,
    selectedId,
    fetchList,
    createQuickFormula,
    deleteQuickFormula,
    saveQuickFormula,
    publishQuickFormula,
    loadQuickFormula,
  }
})
