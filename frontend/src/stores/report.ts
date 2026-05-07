import { defineStore } from 'pinia'
import { ref } from 'vue'
import { reportApi } from '@/api/report'
import type { Report, ReportFilters, ReportTarget } from '@/api/report'
import { MessagePlugin } from 'tdesign-vue-next'

export const useReportStore = defineStore('report', () => {
  const reports = ref<Report[]>([])
  const currentReport = ref<Report | null>(null)
  const targets = ref<ReportTarget[]>([])
  const comparisonData = ref<any>(null)
  const aiAnalysis = ref<any>(null)
  const aiAnalysisLoading = ref(false)
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const filters = ref<ReportFilters>({
    type: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
    generatedBy: 'all',
  })

  const fetchReports = async (params?: ReportFilters & { page?: number; pageSize?: number }) => {
    loading.value = true
    try {
      const merged = { ...filters.value, ...params, page: params?.page ?? currentPage.value, pageSize: params?.pageSize ?? pageSize.value }
      const cleanParams: Record<string, any> = {}
      Object.entries(merged).forEach(([key, value]) => {
        if (value !== 'all' && value !== '' && value != null) {
          cleanParams[key] = value
        }
      })
      const res = await reportApi.getList(cleanParams as any)
      reports.value = res.list
      total.value = res.pagination.total
    } catch (error: any) {
      console.error('获取报告列表失败:', error)
      MessagePlugin.error(error.message || '获取报告列表失败')
    } finally {
      loading.value = false
    }
  }

  const fetchReportById = async (id: string) => {
    loading.value = true
    try {
      const res = await reportApi.getById(id)
      currentReport.value = res

      // 自动加载已保存的AI分析数据
      if (res?.dataJson?.aiAnalysis) {
        console.log('[ReportStore] 📂 发现已保存的AI分析数据')
        aiAnalysis.value = res.dataJson.aiAnalysis
        console.log('[ReportStore] ✅ 已加载AI分析数据:', aiAnalysis.value)
      } else {
        aiAnalysis.value = null
        console.log('[ReportStore] ℹ️ 该报告暂无AI分析数据')
      }

      return res
    } catch (error: any) {
      console.error('获取报告详情失败:', error)
      MessagePlugin.error(error.message || '获取报告详情失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const generateReport = async (data: { type: 'weekly' | 'monthly'; periodStart: string; periodEnd: string; includePlans?: boolean; includeAIAnalysis?: boolean }) => {
    try {
      const res = await reportApi.generate(data)
      MessagePlugin.success('报告生成成功')
      return res
    } catch (error: any) {
      console.error('生成报告失败:', error)
      MessagePlugin.error(error.message || '生成报告失败')
      return null
    }
  }

  const updateReport = async (id: string, data: Partial<{ title: string; dataJson: any; status: string }>) => {
    try {
      const res = await reportApi.update(id, data)
      MessagePlugin.success('报告更新成功')
      if (currentReport.value?.id === id) {
        currentReport.value = res
      }
      return res
    } catch (error: any) {
      console.error('更新报告失败:', error)
      MessagePlugin.error(error.message || '更新报告失败')
      return null
    }
  }

  const deleteReport = async (id: string) => {
    try {
      await reportApi.delete(id)
      MessagePlugin.success('报告删除成功')
      return true
    } catch (error: any) {
      console.error('删除报告失败:', error)
      MessagePlugin.error(error.message || '删除报告失败')
      return false
    }
  }

  const publishReport = async (id: string, reportData?: any, type?: string) => {
    try {
      console.log('[ReportStore] 🚀 开始发布报告，ID:', id)

      const res = await reportApi.publish(id)
      console.log('[ReportStore] ✅ 报告发布成功')

      if (currentReport.value?.id === id) {
        currentReport.value = res
      }

      // 发布成功后自动生成AI分析（异步执行，不阻塞用户）
      if (reportData && type) {
        console.log('[ReportStore] 🤖 开始自动生成AI分析...')
        generateAndSaveAIAnalysis(id, reportData, type).catch(error => {
          console.error('[ReportStore] ⚠️ 自动生成AI分析失败（不影响发布）:', error)
        })
      }

      MessagePlugin.success('报告已发布，正在生成智能分析...')
      return res
    } catch (error: any) {
      console.error('发布报告失败:', error)
      MessagePlugin.error(error.message || '发布报告失败')
      return null
    }
  }

  const generateAndSaveAIAnalysis = async (reportId: string, reportData: any, type: string) => {
    try {
      aiAnalysisLoading.value = true
      console.log('[ReportStore] 🤖 调用AI分析API...')

      const analysisResult = await reportApi.getAIAnalysis(reportData, type)
      console.log('[ReportStore] ✅ AI分析完成:', analysisResult)

      // 保存AI分析结果到报告
      await reportApi.saveAIAnalysis(reportId, analysisResult)
      console.log('[ReportStore] 💾 AI分析结果已保存到报告')

      // 更新本地状态
      aiAnalysis.value = analysisResult

      // 如果当前正在查看这个报告，更新currentReport中的数据
      if (currentReport.value?.id === reportId) {
        currentReport.value = {
          ...currentReport.value,
          dataJson: {
            ...currentReport.value.dataJson,
            aiAnalysis: analysisResult
          }
        }
      }

      return analysisResult
    } catch (error: any) {
      console.error('[ReportStore] ❌ 生成或保存AI分析失败:', error)
      throw error
    } finally {
      aiAnalysisLoading.value = false
    }
  }

  const fetchTargets = async (params?: { periodType?: string }) => {
    try {
      const res = await reportApi.getTargetList(params)
      targets.value = res
      return res
    } catch (error: any) {
      console.error('获取目标列表失败:', error)
      MessagePlugin.error(error.message || '获取目标列表失败')
      return []
    }
  }

  const exportPdf = async (id: string) => {
    try {
      const blob = await reportApi.exportPdf(id)
      const url = window.URL.createObjectURL(blob as any)
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      MessagePlugin.success('PDF 导出成功')
    } catch (error: any) {
      console.error('PDF 导出失败:', error)
      MessagePlugin.error(error.message || 'PDF 导出失败')
    }
  }

  const exportExcel = async (id: string) => {
    try {
      const blob = await reportApi.exportExcel(id)
      const url = window.URL.createObjectURL(blob as any)
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${id}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      MessagePlugin.success('Excel 导出成功')
    } catch (error: any) {
      console.error('Excel 导出失败:', error)
      MessagePlugin.error(error.message || 'Excel 导出失败')
    }
  }

  const compareReports = async (reportId1: string, reportId2: string) => {
    loading.value = true
    try {
      const res = await reportApi.compareReports(reportId1, reportId2)
      comparisonData.value = res
      return res
    } catch (error: any) {
      console.error('报告对比失败:', error)
      MessagePlugin.error(error.message || '报告对比失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const getAIAnalysis = async (reportData: any, type: string) => {
    aiAnalysisLoading.value = true
    try {
      console.log('[ReportStore] 开始调用AI分析API...')
      const res = await reportApi.getAIAnalysis(reportData, type)
      console.log('[ReportStore] ✅ AI分析API响应:', res)
      console.log('[ReportStore] 响应类型:', typeof res)
      console.log('[ReportStore] 响应字段:', res ? Object.keys(res) : 'null/undefined')
      
      aiAnalysis.value = res
      console.log('[ReportStore] aiAnalysis.value 已更新:', aiAnalysis.value)
      return res
    } catch (error: any) {
      console.error('AI 分析失败:', error)
      MessagePlugin.error(error.message || 'AI 分析失败')
      return null
    } finally {
      aiAnalysisLoading.value = false
    }
  }

  const setFilters = (newFilters: Partial<ReportFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1
  }

  const setPage = (page: number) => {
    currentPage.value = page
  }

  return {
    reports,
    currentReport,
    targets,
    comparisonData,
    aiAnalysis,
    aiAnalysisLoading,
    loading,
    total,
    currentPage,
    pageSize,
    filters,
    fetchReports,
    fetchReportById,
    generateReport,
    updateReport,
    deleteReport,
    publishReport,
    fetchTargets,
    exportPdf,
    exportExcel,
    compareReports,
    getAIAnalysis,
    generateAndSaveAIAnalysis,
    setFilters,
    setPage,
  }
})
