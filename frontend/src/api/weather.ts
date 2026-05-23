/**
 * 高德地图天气 & 地理编码 API 封装
 * 通过 Vite 代理（开发）或后端代理（生产）访问，解决 CORS
 *
 * 文档：
 *   - 天气：https://lbs.amap.com/api/webservice/guide/api/weatherinfo
 *   - 地理编码：https://lbs.amap.com/api/webservice/guide/geocode-geo
 *   - 关键词搜索：https://lbs.amap.com/api/webservice/guide/assistant
 */

// ─── 类型定义 ───

export interface CityLocation {
  name: string
  id: string          // 高德 adcode（城市行政代码）
  lat: number
  lon: number
  country: string
  admin1?: string     // 一级行政区（省/州）
  adm1?: string       // alias for admin1
  adm2?: string       // 二级行政区（市）
}

export interface WeatherNow {
  temp: string        // 温度 °C
  feelsLike: string   // 体感温度 °C
  icon: string        // 天气图标标识（高德天气现象代码）
  text: string        // 中文天况描述（"晴"/"多云"/"小雨" 等）
  windDir: string     // 风向（"东北风"）
  windScale: string   // 风力等级（"3级"）
  windSpeed: string   // 风速 km/h
  humidity: string    // 相对湿度 %
  precip: string      // 降水量 mm
  pressure: string    // 气压 hPa
  vis: string         // 能见度 km
}

export interface WeatherData {
  location: CityLocation
  now: WeatherNow
  updateTime: string
}

// ─── 天气现象代码映射（高德天气 code → emoji + 描述）───
interface AmapWeatherInfo {
  emoji: string
  text: string
}

/**
 * 高德天气现象代码对照表
 * 文档：https://lbs.amap.com/api/webservice/guide/api/weatherinfo#description
 */
const amapWeatherMap: Record<string, AmapWeatherInfo> = {
  '00': { emoji: '☀️', text: '晴' },
  '01': { emoji: '🌤️', text: '多云' },
  '02': { emoji: '⛅', text: '少云' },     // 少云（部分有云）
  '03': { emoji: '☁️', text: '晴间多云' },
  '04': { emoji: '☁️', text: '阴' },
  '05': { emoji: '🌧️', text: '阵雨' },
  '06': { emoji: '🌨️', text: '阵雪' },
  '07': { emoji: '🌨️', text: '雨夹雪' },
  '08': { emoji: '🌦️', text: '毛毛雨/细雨' },
  '09': { emoji: '🌧️', text: '小雨' },
  '10': { emoji: '🌧️', text: '中雨' },
  '11': { emoji: '🌧️', text: '大雨' },
  '12': { emoji: '⛈️', text: '暴雨' },
  '13': { emoji: '🌨️', text: '阵雪' },
  '14': { emoji: '❄️', text: '小雪' },
  '15': { emoji: '❄️', text: '中雪' },
  '16': { emoji: '❄️', text: '大雪' },
  '17': { emoji: '⛈️', text: '暴雪' },
  '18': { emoji: '🌫️', text: '雾' },
  '19': { emoji: '🥶', text: '冻雨' },
  '20': { emoji: '🌫️', text: '沙尘暴' },
  '21': { emoji: '🌬️', text: '小-中雨' },
  '22': { emoji: '🌧️', text: '中-大雨' },
  '23': { emoji: '⛈️', text: '大-暴雨' },
  '24': { emoji: '🌨️', text: '雨夹雪' },
  '25': { emoji: '🌨️', text: '小-中雪' },
  '26': { emoji: '❄️', text: '中-大雪' },
  '27': { emoji: '⛈️', text: '大-暴雪' },
  '30': { emoji: '🌦️', text: '浮尘' },
  '31': { emoji: '🌬️', text: '扬沙' },
  '32': { emoji: '🌪️', text: '强沙尘暴' },
  '49': { emoji: '🌫️', text: '霾' },
  '53': { emoji: '🌬️', text: '霾' },
  '54': { emoji: '🌬️', text: '中度霾' },
  '55': { emoji: '🌫️', text: '重度霾' },
  '56': { emoji: '😷', text: '严重霾' },
  '57': { emoji: '🌫️', text: '重度霾' },
  '58': { emoji: '😷', text: '严重霾' },
  '99': { emoji: '❓', text: '未知' },
}

/** 高德天气现象 code → emoji */
export function getWeatherEmoji(code: number | string): string {
  const strCode = String(code).padStart(2, '0')
  return amapWeatherMap[strCode]?.emoji || '🌤️'
}

/** 高德天气现象 code → 中文描述 */
export function getWeatherText(code: number | string): string {
  const strCode = String(code).padStart(2, '0')
  return amapWeatherMap[strCode]?.text || '未知'
}

// ─── 简单 fetch 封装 ───

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** 获取环境变量中的高德 Key */
function getAmapKey(): string {
  return import.meta.env.VITE_AMAP_KEY || ''
}

/** 构建代理 URL（开发环境用 Vite 代理，生产环境用后端） */
function proxyUrl(path: string): string {
  const isDev = import.meta.env.DEV
  if (isDev) return `/amap${path}`
  return `/api/weather/amap${path}`
}

// ─── API 方法 ───

/**
 * 城市名搜索 — 高德关键词搜索 / POI 搜索
 * 返回匹配的城市列表
 */
export async function searchCity(keyword: string): Promise<CityLocation[]> {
  try {
    const key = getAmapKey()
    if (!key) return []

    // 使用高德输入提示接口（更精确的中文城市匹配）
    const data = await fetchJSON<{
      status: string
      info: string
      tips?: Array<{
        id: string           // POI ID 或 adcode
        name: string         // 名称
        district: string     // 所属区域
        adcode: string       // 行政区划代码
        location: string     // 经纬度 "lng,lat"
        address: string       // 详细地址
        city: string[]        // 所属城市数组
      }>
    }>(proxyUrl(`/v3/place/text?keywords=${encodeURIComponent(keyword)}&output=json&key=${key}&citylimit=8&extensions=base`))

    if (data.status !== '1' || !data.tips?.length) return []

    return data.tips
      .filter(tip => tip.location && tip.location.split(',').length === 2)
      .map(tip => {
        const [lonStr, latStr] = tip.location.split(',')
        const lat = parseFloat(latStr)
        const lon = parseFloat(lonStr)
        const district = tip.district || ''
        // 从 district 解析省份和城市名
        // district 格式如 "广东省广州市天河区"
        const parts = district.replace(/(省|市|特别行政区|自治区|壮族|回族|维吾尔|藏族)/g, '$1|').split('|').filter(Boolean)

        return {
          name: tip.name,
          id: tip.adcode || `${lat},${lon}`,
          lat,
          lon,
          country: '中国',
          admin1: parts[0] || '',
        }
      })
  } catch (err: any) {
    console.warn('[WeatherAPI] searchCity 失败:', err.message)
    return []
  }
}

/**
 * 获取实时天气 — 高德天气查询 API
 * city 参数支持：城市名称、adcode、经纬度
 */
export async function fetchWeather(locationId: string): Promise<WeatherData | null> {
  try {
    const key = getAmapKey()
    if (!key) throw new Error('未配置高德 Key')

    // 判断 locationId 类型来选择参数格式
    // 如果是经纬度格式（包含逗号和小数点），使用 city 参数传坐标
    let url: string
    const isCoord = /^[+-]?\d+\.?\d*,[+-]?\d+\.?\d*$/.test(locationId)

    if (isCoord) {
      // 经纬度模式
      url = proxyUrl(`/v3/weather/weatherInfo?city=${encodeURIComponent(locationId)}&key=${key}&extensions=base`)
    } else {
      // 城市名/adcode 模式
      url = proxyUrl(`/v3/weather/weatherInfo?city=${encodeURIComponent(locationId)}&key=${key}&extensions=base`)
    }

    const data = await fetchJSON<{
      status: string
      info: string
      infocode: string
      lives?: Array<{
        province: string
        city: string
        adcode: string
        weather: string      // 天气现象文字（如"晴"、"多云"）
        temperature: string   // 温度字符串（如"25"）
        winddirection: string // 风向
        windpower: string     // 风力等级
        humidity: string      // 湿度
        reporttime: string    // 报告时间
      }>
      forecasts?: Array<{
        province: string
        city: string
        adcode: string
        date: string
        daytemp: string
        nighttemp: string
        dayweather: string
        nightweather: string
        daywind: string
        nightwind: string
        daypower: string
        nightpower: string
      }>
    }>(url)

    if (data.status !== '1') throw new Error(data.info || '高德天气API失败')
    if (!data.lives?.length) throw new Error('无天气数据')

    const live = data.lives[0]

    // 根据天气文字反查天气代码（用于图标显示）
    const weatherCode = reverseLookupWeatherCode(live.weather)

    const now: WeatherNow = {
      temp: live.temperature || '--',
      feelsLike: live.temperature || '--',
      icon: String(weatherCode),
      text: live.weather || '--',
      windDir: live.winddirection || '--',
      windScale: live.windpower ? `${live.windpower}级` : '--',
      windSpeed: windPowerToSpeed(live.windpower),
      humidity: live.humidity || '--',
      precip: '--',
      pressure: '--',
      vis: '--',
    }

    // 解析位置信息
    const locName = live.city || live.province || ''
    let lat = 0, lon = 0

    // 如果是经纬度 ID，尝试保留坐标
    if (isCoord) {
      const [lonStr, latStr] = locationId.split(',')
      lat = parseFloat(latStr)
      lon = parseFloat(lonStr)
      if (isNaN(lat)) lat = 0
      if (isNaN(lon)) lon = 0
    }

    return {
      location: {
        name: locName,
        id: locationId,
        lat,
        lon,
        country: '中国',
        admin1: live.province || '',
      },
      now,
      updateTime: live.reporttime || new Date().toISOString(),
    }
  } catch (err: any) {
    console.warn('[WeatherAPI] fetchWeather 失败:', err.message)
    return null
  }
}

/**
 * 逆地理编码 — 经纬度 → 城市信息（高德 /v3/geocode/regeo）
 * 返回城市的 adcode 和名称
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{ adcode: string; name: string } | null> {
  try {
    const key = getAmapKey()
    if (!key) return null

    const data = await fetchJSON<{
      status: string
      info: string
      regeocode?: {
        addressComponent?: {
          city: string[]
          province: string
          district: string[]
          adcode: string
        }
      }
    }>(proxyUrl(`/v3/geocode/regeo?location=${lon},${lat}&key=${key}&extensions=base&output=json`))

    if (data.status !== '1' || !data.regeocode?.addressComponent) return null

    const comp = data.regeocode.addressComponent
    // 高德返回的 city 可能是空数组（直辖市），用 province 或 district 兜底
    const rawCity = Array.isArray(comp.city) ? comp.city[0] : ''
    const rawDistrict = Array.isArray(comp.district) ? comp.district[0] : ''
    const name = rawCity || rawDistrict || comp.province || '未知'
    const adcode = comp.adcode

    return { adcode, name }
  } catch (err: any) {
    console.warn('[WeatherAPI] reverseGeocode 失败:', err.message)
    return null
  }
}

/**
 * 通过天气文字反查高德天气现象代码
 */
function reverseLookupWeatherCode(weatherText: string): number {
  const map: Record<string, number> = {
    '晴': 0,
    '多云': 1,
    '少云': 2,
    '晴间多云': 3,
    '阴': 4,
    '阵雨': 5,
    '阵雪': 6,
    '雨夹雪': 7,
    '毛毛雨': 8, '细雨': 8, '小雨': 9,
    '中雨': 10,
    '大雨': 11,
    '暴雨': 12,
    '大暴雨': 13, '特大暴雨': 13,
    '小雪': 14,
    '中雪': 15,
    '大雪': 16,
    '暴雪': 17,
    '雾': 18,
    '冻雨': 19,
    '沙尘暴': 20, '沙尘': 21, '扬沙': 22, '浮尘': 23,
    '霾': 49,
    '未知': 99,
  }
  return map[weatherText] ?? 1
}

/**
 * 风力等级（如"≤3"或"4-5"）→ 近似风速 km/h
 */
function windPowerToSpeed(power: string | undefined): string {
  if (!power) return '--'
  // 提取数字（处理 "≤3", "4-5", "3" 等格式）
  const match = power.match(/\d+/)
  if (!match) return '--'
  const level = parseInt(match[0], 10)
  // 蒲福风级近似换算（km/h）
  const speeds: Record<number, number> = {
    0: 1, 1: 5, 2: 11, 3: 19, 4: 28,
    5: 38, 6: 50, 7: 62, 8: 74, 9: 88,
    10: 102, 11: 117, 12: 133,
  }
  return String(speeds[level] ?? level * 12)
}
