import { defineStore } from 'pinia'
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import * as quickFormulaApi from '@/api/quickFormula'
import type { QuickFormulaItem, PublishData } from '@/types/quickFormula'

const MAX_RETRY = 10

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
      const res = await quickFormulaApi.createQuickFormula({ name }, { _silent: true }) as unknown as QuickFormulaItem
      MessagePlugin.success('快速配方创建成功')
      await fetchList()
      return res
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: { message?: string } } } }
      if (axiosErr.response?.status === 409) {
        for (let i = 2; i <= MAX_RETRY; i++) {
          try {
            const newName = `${name}(${i})`
            const res = await quickFormulaApi.createQuickFormula({ name: newName }, { _silent: true }) as unknown as QuickFormulaItem
            MessagePlugin.success(`快速配方创建成功：${newName}`)
            await fetchList()
            return res
          } catch (retryErr: unknown) {
            const retryAxiosErr = retryErr as { response?: { status?: number } }
            if (retryAxiosErr.response?.status !== 409) break
          }
        }
        MessagePlugin.error('名称冲突次数过多，请更换配方名称')
      } else {
        MessagePlugin.error('创建快速配方失败')
      }
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
      await quickFormulaApi.updateQuickFormula(id, data, { _silent: true })
      MessagePlugin.success('保存成功')
      await fetchList()
      return true
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: { message?: string; details?: string[] } } } }
      const errData = axiosErr?.response?.data?.error
      if (errData?.details && errData.details.length > 0) {
        MessagePlugin.warning(errData.details.join('；'))
      } else if (errData?.message) {
        MessagePlugin.warning(errData.message)
      } else {
        MessagePlugin.error('保存失败，请检查数据后重试')
      }
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
