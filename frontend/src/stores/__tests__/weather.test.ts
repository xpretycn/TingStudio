import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useWeatherStore } from "@/stores/weather";
import type { WeatherData } from "@/api/weather";

const mockFetchWeather = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    }),
  ),
);

const mockSearchCity = vi.hoisted(() => vi.fn(() => Promise.resolve([{ id: "420100", name: "武汉" }])));

vi.mock("@/api/weather", () => ({
  searchCity: mockSearchCity,
  fetchWeather: mockFetchWeather,
  reverseGeocode: vi.fn(() => Promise.resolve({ adcode: "420100", name: "武汉" })),
  getWeatherEmoji: vi.fn(() => "☀️"),
}));

describe("Weather Store", () => {
  let store: ReturnType<typeof useWeatherStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useWeatherStore();
    mockFetchWeather.mockResolvedValue({
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    });
    mockSearchCity.mockResolvedValue([{ id: "420100", name: "武汉" }]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("WTH-01: 初始状态应正确设置", () => {
    expect(store.weather).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.geoLoading).toBe(false);
    expect(store.errorMsg).toBe("");
    expect(store.searchResults).toEqual([]);
  });

  it('WTH-02: temperature 计算属性应返回温度或 "--"', () => {
    expect(store.temperature).toBe("--");
    store.weather = {
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    };
    expect(store.temperature).toBe("25");
  });

  it("WTH-03: weatherText 计算属性应返回天气文本", () => {
    expect(store.weatherText).toBe("--");
    store.weather = {
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    };
    expect(store.weatherText).toBe("晴");
  });

  it("WTH-04: weatherIcon 应根据天气类型返回分类标识", () => {
    const base = {
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    };

    store.weather = base as unknown as WeatherData;
    expect(store.weatherIcon).toBe("sunny");

    store.weather = { ...base, now: { ...base.now, text: "多云" } } as unknown as WeatherData;
    expect(store.weatherIcon).toBe("cloudy");

    store.weather = { ...base, now: { ...base.now, text: "小雨" } } as unknown as WeatherData;
    expect(store.weatherIcon).toBe("rainy");

    store.weather = { ...base, now: { ...base.now, text: "小雪" } } as unknown as WeatherData;
    expect(store.weatherIcon).toBe("snowy");

    store.weather = { ...base, now: { ...base.now, text: "雾" } } as unknown as WeatherData;
    expect(store.weatherIcon).toBe("hazy");
  });

  it('WTH-05: cityName 计算属性应返回城市名或"未定位"', () => {
    expect(store.cityName).toBe("未定位");
    store.weather = {
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    };
    expect(store.cityName).toBe("武汉");
  });

  it("WTH-06: hasWeather 计算属性应在有数据时为 true", () => {
    expect(store.hasWeather).toBe(false);
    store.weather = {
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    };
    expect(store.hasWeather).toBe(true);
  });

  it("WTH-07: getWeather 应获取天气数据并设置状态", async () => {
    await store.getWeather("420100", "武汉");
    expect(store.weather).not.toBeNull();
    expect(store.loading).toBe(false);
    expect(store.errorMsg).toBe("");
  });

  it("WTH-08: getWeather 失败时应设置错误信息", async () => {
    mockFetchWeather.mockRejectedValueOnce(new Error("网络错误"));
    await store.getWeather("invalid");
    expect(store.errorMsg.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
  });

  it("WTH-09: searchAndFetchWeather 应搜索城市并获取天气", async () => {
    await store.searchAndFetchWeather("武汉");
    expect(store.searchResults.length).toBeGreaterThan(0);
    expect(store.searchLoading).toBe(false);
  });

  it("WTH-10: selectCity 应选择搜索结果中的城市", async () => {
    await store.selectCity({ id: "420100", name: "武汉" });
    expect(store.weather?.location?.name).toBe("武汉");
  });

  it("WTH-11: clearSearch 应清空搜索结果", () => {
    store.searchResults = [{ id: "1", name: "北京" }];
    store.clearSearch();
    expect(store.searchResults).toEqual([]);
  });

  it("WTH-12: refresh 应强制刷新当前城市天气", async () => {
    store.weather = {
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    };
    await store.refresh();
    expect(mockFetchWeather).toHaveBeenCalled();
  });

  it("WTH-13: humidity/windScale/windDir 等计算属性应正确返回", () => {
    store.weather = {
      now: {
        temp: "25",
        text: "晴",
        icon: "100",
        humidity: "60",
        windScale: "3",
        windDir: "东北风",
        windSpeed: "10",
        feelsLike: "26",
      },
      location: { id: "420100", name: "武汉" },
      updateTime: "2026-04-19T10:00+08:00",
    };
    expect(store.humidity).toBe("60");
    expect(store.windScale).toBe("3");
    expect(store.windDir).toBe("东北风");
    expect(store.windSpeed).toBe("10");
    expect(store.feelsLike).toBe("26");
  });

  it("WTH-14: searchAndFetchWeather 搜索失败时应清空结果", async () => {
    mockSearchCity.mockRejectedValueOnce(new Error("搜索失败"));
    await store.searchAndFetchWeather("不存在的城市");
    expect(store.searchResults).toEqual([]);
  });
});
