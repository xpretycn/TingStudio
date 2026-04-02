/**
 * 和风天气 API 封装
 * 独立 axios 实例，不走后端代理
 */
import axios from 'axios'

const API_KEY = import.meta.env.VITE_QWEATHER_KEY || ''
const API_BASE = 'https://devapi.qweather.com/v7'
const MAX_RETRIES = 2

// ─── 类型定义 ───

export interface CityLocation {
  name: string
  id: string
  lat: string
  lon: string
  adm2: string
  adm1: string
  country: string
}

export interface WeatherNow {
  temp: string
  feelsLike: string
  icon: string
  text: string
  wind360: string
  windDir: string
  windScale: string
  windSpeed: string
  humidity: string
  precip: string
  pressure: string
  vis: string
  cloud: string
  dew: string
}

export interface WeatherData {
  location: CityLocation
  now: WeatherNow
  updateTime: string
}

export interface GeoResponse {
  code: string
  location?: CityLocation[]
}

export interface WeatherResponse {
  code: string
  now?: WeatherNow
  updateTime?: string
}

// ─── 天气图标 → Emoji 映射 ───
const iconEmojiMap: Record<string, string> = {
  '100': '☀️', '150': '🌙',
  '101': '🌤️', '102': '⛅', '103': '🌥️', '104': '☁️',
  '151': '🌙', '152': '🌙', '153': '🌙', '154': '🌙',
  '300': '🌧️', '301': '🌦️', '302': '⛈️', '303': '🌨️', '304': '🌧️', '305': '🌧️',
  '306': '🌧️', '307': '🌧️', '308': '🌧️', '309': '🌧️', '310': '🌧️',
  '311': '🌧️', '312': '🌧️', '313': '🌧️', '314': '🌧️', '315': '🌧️',
  '316': '🌧️', '317': '🌧️', '318': '🌧️', '399': '🌧️',
  '400': '🌨️', '401': '🌨️', '402': '🌨️', '403': '🌨️', '404': '🌨️',
  '405': '🌨️', '406': '🌨️', '407': '🌨️', '408': '🌨️', '409': '🌨️', '410': '🌨️',
  '499': '🌨️',
  '500': '🌫️', '501': '🌫️', '502': '🌫️', '503': '🌫️', '504': '🌫️',
  '507': '🌫️', '508': '🌫️', '509': '🌫️', '510': '🌫️', '511': '🌫️', '512': '🌫️',
  '513': '🌫️', '514': '🌫️', '515': '🌫️',
  '900': '🌡️', '901': '🌡️', '902': '🌬️', '903': '🌬️', '904': '🌬️', '905': '🌫️',
  '999': '❄️',
}

export function getWeatherEmoji(iconCode: string): string {
  return iconEmojiMap[iconCode] || '🌤️'
}

// ─── 独立 axios 实例 ───
const weatherAxios = axios.create({
  timeout: 10000,
})

// 429 限流响应拦截器 — 指数退避重试
weatherAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (!config) return Promise.reject(error)

    if (error.response?.status === 429) {
      config.__retryCount = config.__retryCount || 0
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount++
        const delay = Math.pow(2, config.__retryCount) * 1000 // 2s, 4s
        await new Promise((r) => setTimeout(r, delay))
        return weatherAxios(config)
      }
    }
    return Promise.reject(error)
  }
)

// ─── API 方法 ───

/** 城市名搜索 */
export async function searchCity(keyword: string): Promise<CityLocation[]> {
  const res = await weatherAxios.get<GeoResponse>(`${API_BASE}/geo/city/lookup`, {
    params: { location: keyword, key: API_KEY, number: 8 },
  })
  if (res.data.code !== '200' || !res.data.location?.length) {
    return []
  }
  return res.data.location
}

/** 逆地理编码 — 经纬度 → 城市 */
export async function reverseGeocode(lat: number, lon: number): Promise<CityLocation | null> {
  const res = await weatherAxios.get<GeoResponse>(`${API_BASE}/geo/city/lookup`, {
    params: { location: `${lon},${lat}`, key: API_KEY, number: 1 },
  })
  if (res.data.code !== '200' || !res.data.location?.length) {
    return null
  }
  return res.data.location[0]
}

/** 获取实时天气 */
export async function fetchWeather(locationId: string): Promise<WeatherData | null> {
  const res = await weatherAxios.get<WeatherResponse>(`${API_BASE}/weather/now`, {
    params: { location: locationId, key: API_KEY },
  })
  if (res.data.code !== '200' || !res.data.now) {
    return null
  }
  return {
    location: { name: '', id: locationId, lat: '', lon: '', adm2: '', adm1: '', country: '' },
    now: res.data.now,
    updateTime: res.data.updateTime || '',
  }
}
