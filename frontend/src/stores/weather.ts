/**
 * 天气 Pinia Store
 * 管理 30 分钟缓存、Geolocation 定位、城市持久化
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  searchCity,
  reverseGeocode,
  fetchWeather,
  getWeatherEmoji,
} from '@/api/weather'
import type { CityLocation, WeatherData } from '@/api/weather'

const CACHE_TTL = 30 * 60 * 1000 // 30 分钟
const CITY_STORAGE_KEY = 'ting-weather-city'

interface CacheEntry {
  data: WeatherData
  timestamp: number
}

export const useWeatherStore = defineStore('weather', () => {
  // ─── 状态 ───
  const weather = ref<WeatherData | null>(null)
  const loading = ref(false)
  const rateLimited = ref(false)
  const geoLoading = ref(false)
  const errorMsg = ref('')
  const searchResults = ref<CityLocation[]>([])
  const searchLoading = ref(false)

  // ─── 缓存 ───
  const cache = new Map<string, CacheEntry>()

  // ─── 计算属性 ───
  const temperature = computed(() => weather.value?.now?.temp ?? '--')
  const weatherText = computed(() => weather.value?.now?.text ?? '--')
  const weatherEmoji = computed(() =>
    weather.value?.now?.icon ? getWeatherEmoji(weather.value.now.icon) : '🌤️'
  )
  const humidity = computed(() => weather.value?.now?.humidity ?? '--')
  const windScale = computed(() => weather.value?.now?.windScale ?? '--')
  const windDir = computed(() => weather.value?.now?.windDir ?? '--')
  const windSpeed = computed(() => weather.value?.now?.windSpeed ?? '--')
  const feelsLike = computed(() => weather.value?.now?.feelsLike ?? '--')
  const cityName = computed(() => weather.value?.location?.name ?? '未定位')
  const updateTime = computed(() => weather.value?.updateTime ?? '')
  const hasWeather = computed(() => !!weather.value)

  // ─── 核心方法 ───

  /** 获取天气（带缓存） */
  async function getWeather(locationId: string, cityNameValue: string) {
    // 检查缓存
    const cached = cache.get(locationId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      weather.value = cached.data
      weather.value.location.name = cityNameValue
      errorMsg.value = ''
      return
    }

    loading.value = true
    rateLimited.value = false
    errorMsg.value = ''

    try {
      const data = await fetchWeather(locationId)
      if (data) {
        data.location.name = cityNameValue
        weather.value = data
        cache.set(locationId, { data, timestamp: Date.now() })
        errorMsg.value = ''
      } else {
        errorMsg.value = '未找到该城市的天气数据'
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        rateLimited.value = true
        errorMsg.value = '请求过于频繁，请稍后再试'
      } else {
        errorMsg.value = '获取天气数据失败，请检查网络连接'
      }
    } finally {
      loading.value = false
    }
  }

  /** 按城市名搜索并获取天气 */
  async function searchAndFetchWeather(keyword: string) {
    searchLoading.value = true
    try {
      const cities = await searchCity(keyword)
      searchResults.value = cities
      // 如果恰好一个结果，直接获取天气
      if (cities.length === 1) {
        await getWeather(cities[0].id, cities[0].name)
        persistCity(cities[0].name)
      }
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }

  /** 选择搜索结果中的城市 */
  async function selectCity(city: CityLocation) {
    searchResults.value = []
    await getWeather(city.id, city.name)
    persistCity(city.name)
  }

  /** 清空搜索结果 */
  function clearSearch() {
    searchResults.value = []
  }

  /** Geolocation 自动定位 */
  async function autoLocate() {
    if (!navigator.geolocation) {
      errorMsg.value = '当前浏览器不支持定位功能'
      return
    }

    geoLoading.value = true
    errorMsg.value = ''

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 分钟内缓存
        })
      })

      const { latitude, longitude } = position.coords
      const city = await reverseGeocode(latitude, longitude)
      if (city) {
        await getWeather(city.id, city.name)
        persistCity(city.name)
      } else {
        errorMsg.value = '无法识别当前位置的城市，请手动搜索城市名'
      }
    } catch (err: any) {
      if (err.code === 1) {
        errorMsg.value = '定位权限被拒绝，请手动搜索城市名'
      } else if (err.code === 2) {
        errorMsg.value = '无法获取位置信息，请手动搜索城市名'
      } else if (err.code === 3) {
        errorMsg.value = '定位超时，请手动搜索城市名'
      } else {
        errorMsg.value = '定位失败，请手动搜索城市名'
      }
    } finally {
      geoLoading.value = false
    }
  }

  /** 持久化最后查询的城市 */
  function persistCity(name: string) {
    localStorage.setItem(CITY_STORAGE_KEY, name)
  }

  function getLastCity(): string | null {
    return localStorage.getItem(CITY_STORAGE_KEY)
  }

  /** 初始化：先恢复上次城市，再自动定位 */
  async function init() {
    const lastCity = getLastCity()
    if (lastCity) {
      const cities = await searchCity(lastCity)
      if (cities.length > 0) {
        await getWeather(cities[0].id, cities[0].name)
      }
    }
    // 无论上次城市是否恢复成功，都尝试自动定位以获取最新
    await autoLocate()
  }

  return {
    // 状态
    weather,
    loading,
    rateLimited,
    geoLoading,
    errorMsg,
    searchResults,
    searchLoading,
    // 计算属性
    temperature,
    weatherText,
    weatherEmoji,
    humidity,
    windScale,
    windDir,
    windSpeed,
    feelsLike,
    cityName,
    updateTime,
    hasWeather,
    // 方法
    getWeather,
    searchAndFetchWeather,
    selectCity,
    clearSearch,
    autoLocate,
    init,
  }
})
