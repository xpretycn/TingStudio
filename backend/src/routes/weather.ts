/**
 * 天气相关路由
 * 提供高德地图 API 代理（IP定位 + 天气查询 + 地理编码），解决前端 CORS 问题
 */
import { Router, Request, Response } from 'express'

const router = Router()

// 从环境变量读取高德 Key
const AMAP_KEY = process.env.AMAP_KEY || ''
const AMAP_BASE = 'https://restapi.amap.com'

/**
 * GET /api/weather/location
 * 代理高德地图 IP 定位 API
 */
router.get('/location', async (req: Request, res: Response) => {
  try {
    if (!AMAP_KEY) {
      res.status(500).json({ success: false, message: '未配置高德地图 Key' })
      return
    }

    const amapUrl = `${AMAP_BASE}/v3/ip?key=${AMAP_KEY}&type=4`

    const response = await fetch(amapUrl, {
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    res.json({ success: true, data })
  } catch (error: any) {
    console.error('[Weather] 高德IP定位失败:', error.message)
    const status = error.message?.includes('timeout') ? 504 : 502
    res.status(status).json({ success: false, message: error.message })
  }
})

/**
 * GET /api/weather/amap/*
 * 通用的 高德 REST API 代理
 * 支持天气查询、地理编码、关键词搜索等所有高德 Web 服务
 *
 * 用法：
 *   /api/weather/amap/v3/weather/weatherInfo?city=北京&key=xxx
 *   /api/weather/amap/v3/place/text?keywords=广州&key=xxx
 */
router.get('/amap/*', async (req: Request, res: Response) => {
  try {
    // 获取路径中的高德 API 子路径（去掉前缀 "/api/weather/amap"）
    const amapPath = req.path.replace(/^\/api\/weather\/amap/, '')
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString()
    const amapUrl = `${AMAP_BASE}${amapPath}${queryString ? '?' + queryString : ''}`

    console.log(`[Weather] 代理请求 → ${amapUrl}`)

    const response = await fetch(amapUrl, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) throw new Error(`高德API HTTP ${response.status}`)

    const data = await response.json()
    res.json(data) // 直接转发高德原始响应格式
  } catch (error: any) {
    console.error('[Weather] 高德API代理失败:', error.message)
    const status = error.message?.includes('timeout') ? 504 : 502
    res.status(status).json({
      status: '0',
      info: `代理服务错误: ${error.message}`,
      infocode: String(status),
    })
  }
})

export const weatherRoutes = router
