export interface CityLocation {
  name: string
  id: string
  lat: number
  lon: number
  country: string
  admin1?: string
  adm1?: string
  adm2?: string
}

export interface WeatherNow {
  temp: string
  feelsLike: string
  icon: string
  text: string
  windDir: string
  windScale: string
  windSpeed: string
  humidity: string
  precip: string
  pressure: string
  vis: string
}

export interface WeatherData {
  location: CityLocation
  now: WeatherNow
  updateTime: string
}

interface AmapWeatherInfo {
  emoji: string
  text: string
}

const amapWeatherMap: Record<string, AmapWeatherInfo> = {
  '00': { emoji: '☀️', text: '晴' },
  '01': { emoji: '🌤️', text: '多云' },
  '02': { emoji: '⛅', text: '少云' },
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

export function getWeatherEmoji(code: number | string): string {
  const strCode = String(code).padStart(2, '0')
  return amapWeatherMap[strCode]?.emoji || '🌤️'
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function getAmapKey(): string {
  return import.meta.env.VITE_AMAP_KEY || ''
}

function proxyUrl(path: string): string {
  const isDev = import.meta.env.DEV
  if (isDev) return `/amap${path}`
  return `/api/weather/amap${path}`
}

export async function searchCity(keyword: string): Promise<CityLocation[]> {
  try {
    const key = getAmapKey()
    if (!key) return []

    const data = await fetchJSON<{
      status: string
      info: string
      tips?: Array<{
        id: string
        name: string
        district: string
        adcode: string
        location: string
        address: string
        city: string[]
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[WeatherAPI] searchCity 失败:', message)
    return []
  }
}

export async function fetchWeather(locationId: string): Promise<WeatherData | null> {
  try {
    const key = getAmapKey()
    if (!key) throw new Error('未配置高德 Key')

    let url: string
    const isCoord = /^[+-]?\d+\.?\d*,[+-]?\d+\.?\d*$/.test(locationId)

    if (isCoord) {
      url = proxyUrl(`/v3/weather/weatherInfo?city=${encodeURIComponent(locationId)}&key=${key}&extensions=base`)
    } else {
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
        weather: string
        temperature: string
        winddirection: string
        windpower: string
        humidity: string
        reporttime: string
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

    const locName = live.city || live.province || ''
    let lat = 0, lon = 0

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[WeatherAPI] fetchWeather 失败:', message)
    return null
  }
}

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
    const rawCity = Array.isArray(comp.city) ? comp.city[0] : ''
    const rawDistrict = Array.isArray(comp.district) ? comp.district[0] : ''
    const name = rawCity || rawDistrict || comp.province || '未知'
    const adcode = comp.adcode

    return { adcode, name }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[WeatherAPI] reverseGeocode 失败:', message)
    return null
  }
}

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

function windPowerToSpeed(power: string | undefined): string {
  if (!power) return '--'
  const match = power.match(/\d+/)
  if (!match) return '--'
  const level = parseInt(match[0], 10)
  const speeds: Record<number, number> = {
    0: 1, 1: 5, 2: 11, 3: 19, 4: 28,
    5: 38, 6: 50, 7: 62, 8: 74, 9: 88,
    10: 102, 11: 117, 12: 133,
  }
  return String(speeds[level] ?? level * 12)
}
