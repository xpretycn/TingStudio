/**
 * 天气 Pinia Store
 * 基于 高德地图 API（天气 + IP定位），管理缓存、定位、城市持久化
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { searchCity, fetchWeather, reverseGeocode, getWeatherEmoji } from "@/api/weather";
import type { CityLocation, WeatherData } from "@/api/weather";

const CACHE_TTL = 30 * 60 * 1000; // 30 分钟
const CITY_STORAGE_KEY = "ting-weather-city";
const FALLBACK_CITY = "北京"; // 默认城市，定位失败时的兜底

// 高德地图 Web服务 Key
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || "";

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

export const useWeatherStore = defineStore("weather", () => {
  // ─── 状态 ───
  const weather = ref<WeatherData | null>(null);
  const loading = ref(false);
  const geoLoading = ref(false);
  const errorMsg = ref("");
  const searchResults = ref<CityLocation[]>([]);
  const searchLoading = ref(false);

  // ─── 缓存 ───
  const cache = new Map<string, CacheEntry>();

  // ─── 计算属性 ───
  const temperature = computed(() => weather.value?.now?.temp ?? "--");
  const weatherText = computed(() => weather.value?.now?.text ?? "--");
  const weatherEmoji = computed(() => (weather.value?.now?.icon ? getWeatherEmoji(weather.value.now.icon) : "🌤️"));
  /** 天气类型标识（用于 CSS 动画分类） */
  const weatherIcon = computed(() => {
    const text = weather.value?.now?.text || "";
    if (text === "晴") return "sunny";
    if (["多云", "少云", "晴间多云"].includes(text)) return "cloudy";
    if (text === "阴") return "overcast";
    if (["阵雨", "小雨", "中雨", "大雨", "暴雨", "毛毛雨", "细雨", "小-中雨", "中-大雨", "大-暴雨"].includes(text))
      return "rainy";
    if (["阵雪", "小雪", "中雪", "大雪", "暴雪", "雨夹雪", "小-中雪", "中-大雪", "大-暴雪"].includes(text))
      return "snowy";
    if (["雾", "霾", "浮尘", "扬沙", "沙尘暴", "强沙尘暴", "中度霾", "重度霾", "严重霾"].includes(text)) return "hazy";
    return "default";
  });
  const humidity = computed(() => weather.value?.now?.humidity ?? "--");
  const windScale = computed(() => weather.value?.now?.windScale ?? "--");
  const windDir = computed(() => weather.value?.now?.windDir ?? "--");
  const windSpeed = computed(() => weather.value?.now?.windSpeed ?? "--");
  const feelsLike = computed(() => weather.value?.now?.feelsLike ?? "--");
  const cityName = computed(() => weather.value?.location?.name ?? "未定位");
  const updateTime = computed(() => weather.value?.updateTime ?? "");
  const hasWeather = computed(() => !!weather.value);

  // ─── 核心方法 ───

  /** 获取天气（带缓存） */
  async function getWeather(locationId: string, _cityNameValue?: string) {
    const cached = cache.get(locationId);
    // 缓存命中时直接使用（除非强制刷新）
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !forceRefresh.value) {
      weather.value = cached.data;
      // 高德已返回中文城市名，仅在无城市名时用传入值覆盖
      if (!weather.value.location.name && _cityNameValue) {
        weather.value.location.name = _cityNameValue;
      }
      errorMsg.value = "";
      return;
    }

    loading.value = true;
    forceRefresh.value = false;
    errorMsg.value = "";

    try {
      const data = await fetchWeather(locationId);
      if (data) {
        // 高德天气API已返回中文城市名，优先使用
        if (_cityNameValue && !data.location.name) {
          data.location.name = _cityNameValue;
        }
        weather.value = data;
        cache.set(locationId, { data, timestamp: Date.now() });
        errorMsg.value = "";
      } else {
        errorMsg.value = "未找到该城市的天气数据";
      }
    } catch {
      errorMsg.value = "获取天气数据失败，请检查网络连接";
    } finally {
      loading.value = false;
    }
  }

  /** 强制刷新标记 */
  const forceRefresh = ref(false);

  /** 强制刷新当前城市天气（忽略缓存） */
  async function refresh() {
    if (!weather.value?.location?.id) return;
    console.log("[Weather] 强制刷新天气...");
    forceRefresh.value = true;
    await getWeather(weather.value.location.id);
  }

  /** 按城市名搜索并获取天气 */
  async function searchAndFetchWeather(keyword: string) {
    searchLoading.value = true;
    try {
      const cities = await searchCity(keyword);
      searchResults.value = cities;
      if (cities.length === 1) {
        await getWeather(cities[0].id, cities[0].name);
        persistCity(cities[0].name);
      }
    } catch {
      searchResults.value = [];
    } finally {
      searchLoading.value = false;
    }
  }

  /** 选择搜索结果中的城市 */
  async function selectCity(city: CityLocation) {
    searchResults.value = [];
    await getWeather(city.id, city.name);
    persistCity(city.name);
  }

  /** 清空搜索结果 */
  function clearSearch() {
    searchResults.value = [];
  }

  /** 多级 IP 定位策略：高德 → ip-api.com → 默认城市 */
  async function autoLocate() {
    geoLoading.value = true;
    errorMsg.value = "";
    console.log("[Weather] autoLocate 开始...");

    try {
      // ── 第一优先级：高德地图 IP 定位 ──
      if (AMAP_KEY) {
        try {
          const result = await locateByAmap();
          if (result) return;
          console.warn("[Weather] 高德返回空数据，尝试备用服务...");
        } catch (err: any) {
          console.warn("[Weather] 高德定位失败:", err.message);
        }
      } else {
        console.warn("[Weather] 未配置 AMAP_KEY，跳过高德");
      }

      // ── 第二优先级：ip-api.com 备用定位（免费无需Key）──
      console.log("[Weather] 尝试 ip-api.com 备用定位...");
      const result = await locateByIpApi();
      if (result) return;

      // ── 第三优先级：默认城市兜底 ──
      throw new Error("所有IP定位服务均无法获取位置信息");
    } catch (err: any) {
      console.error("[Weather] 定位异常:", err);
      const reason =
        err.name === "AbortError" || err.message?.includes("timeout") ? "定位请求超时" : `定位失败(${err.message})`;
      await fallbackToDefaultCity(reason + `，已切换至${FALLBACK_CITY}`);
    } finally {
      geoLoading.value = false;
    }
  }

  /** 高德地图 IP 定位 */
  async function locateByAmap(): Promise<boolean> {
    const isDev = import.meta.env.DEV;
    const url = isDev ? `/amap/v3/ip?key=${AMAP_KEY}&type=4` : `/api/weather/location`;

    console.log("[Weather] 高德请求:", url);

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`高德HTTP ${res.status}`);

    const json = await res.json();
    console.log("[Weather] 高德响应:", JSON.stringify(json));

    const data: Record<string, any> = isDev ? json : json?.data;

    if (!isDev && !json?.success) throw new Error(json?.message || "后端代理失败");
    if (!data || data.status !== "1") throw new Error(data?.info || "高德失败");

    // 检查是否有有效数据（非空数组）
    const hasValidData =
      (typeof data.province === "string" && data.province.trim() && data.province !== "[]") ||
      (Array.isArray(data.province) && data.province.length > 0);

    if (!hasValidData) {
      console.warn("[Weather] 高德返回空数据，跳过");
      return false;
    }

    // 提取城市名
    const rawProvince = Array.isArray(data.province) ? data.province[0] : String(data.province || "");
    const rawCity = Array.isArray(data.city) ? data.city[0] : String(data.city || "");
    const province = rawProvince.replace(/^\[|\]$/g, "").trim();
    const city = rawCity.replace(/^\[|\]$/g, "").trim();

    const searchKeyword = province && city && city !== province ? city : province || city;
    if (!searchKeyword) {
      console.warn("[Weather] 无法提取城市名");
      return false;
    }

    console.log("[Weather] 高德城市:", searchKeyword);

    const cities = await searchCity(searchKeyword);
    if (cities.length === 0) {
      console.warn("[Weather] 城市搜索无结果");
      return false;
    }

    const best = cities[0];
    console.log("[Weather] 精确定位:", best.name, "→", best.id);
    await getWeather(best.id, best.name);
    persistCity(best.name);
    return true;
  }

  /** ip-api.com 备用 IP 定位（免费无需 Key）*/
  async function locateByIpApi(): Promise<boolean> {
    const url = "/ip-api/json";
    const MAX_RETRIES = 2;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[Weather] ip-api 请求 (第${attempt}次):`, url);

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
          if (res.status >= 500 && attempt < MAX_RETRIES) {
            console.warn(`[Weather] ip-api ${res.status}，第${attempt}次重试...`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw new Error(`ip-api HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("[Weather] ip-api 响应:", JSON.stringify(data));

        if (data.status === "fail") throw new Error(data.message || "ip-api失败");

        const lat = data.lat;
        const lon = data.lon;
        const cityName = data.city || data.regionName || data.country || "";
        const region = data.regionName || "";

        if (!lat || !lon) throw new Error("ip-api 无坐标数据");

        let searchKeyword = "";
        if (cityName && region && cityName !== region) {
          searchKeyword = cityName;
        } else if (region) {
          searchKeyword = region;
        } else if (cityName) {
          searchKeyword = cityName;
        }

        if (searchKeyword) {
          console.log("[Weather] ip-api 城市:", searchKeyword, "| 坐标:", lat, lon);
          const cities = await searchCity(searchKeyword);
          if (cities.length > 0) {
            const best = cities[0];
            console.log("[Weather] 精确定位:", best.name, "→", best.id);
            await getWeather(best.id, best.name);
            persistCity(best.name);
            return true;
          }
          console.log("[Weather] ip-api 城市搜索无结果，尝试逆地理编码");
        }

        console.log("[Weather] 使用 ip-api 坐标做逆地理编码:", lat, lon);
        const geo = await reverseGeocode(lat, lon);
        if (geo && geo.adcode) {
          await getWeather(geo.adcode, geo.name);
          persistCity(geo.name);
          return true;
        }

        const locationId = `${lat},${lon}`;
        const displayName = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        console.log("[Weather] 逆地理编码无效，使用原始坐标:", locationId);
        await getWeather(locationId, displayName);
        persistCity(displayName);
        return true;
      } catch (err: any) {
        console.warn(`[Weather] ip-api 第${attempt}次失败:`, err.message);
        if (attempt < MAX_RETRIES) continue;
        return false;
      }
    }
    return false;
  }

  /** 定位失败时的默认城市兜底 */
  async function fallbackToDefaultCity(reason: string) {
    errorMsg.value = reason;
    console.warn(`[Weather] ${reason}，使用默认城市: ${FALLBACK_CITY}`);
    try {
      const cities = await searchCity(FALLBACK_CITY);
      if (cities.length > 0) {
        await getWeather(cities[0].id, cities[0].name);
        persistCity(FALLBACK_CITY);
        errorMsg.value = ""; // 成功获取后清除错误提示
      }
    } catch {
      errorMsg.value = reason + "，请手动搜索城市名";
    }
  }

  /** 持久化最后查询的城市 */
  function persistCity(name: string) {
    localStorage.setItem(CITY_STORAGE_KEY, name);
  }

  function getLastCity(): string | null {
    return localStorage.getItem(CITY_STORAGE_KEY);
  }

  /** 初始化：先恢复上次城市，再通过高德IP定位获取最新位置天气 */
  async function init() {
    // 1. 先恢复上次城市缓存
    const lastCity = getLastCity();
    let hasCache = false;

    if (lastCity) {
      try {
        const cities = await searchCity(lastCity);
        if (cities.length > 0) {
          await getWeather(cities[0].id, cities[0].name);
          hasCache = true;
        }
      } catch {
        // 搜索失败，继续走定位流程
      }
    }

    // 2. 通过高德IP定位获取最新位置
    try {
      await autoLocate();
    } catch {
      // 定位失败时，如果有缓存则不报错
      if (!hasCache) {
        await fallbackToDefaultCity("定位失败");
      }
    }
  }

  return {
    // 状态
    weather,
    loading,
    geoLoading,
    errorMsg,
    searchResults,
    searchLoading,
    // 计算属性
    temperature,
    weatherText,
    weatherEmoji,
    weatherIcon,
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
    refresh,
    init,
  };
});
