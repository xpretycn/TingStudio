<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { useMaterialStore } from "@/stores/material";
import { useEnumStore } from "@/stores/enum";
import type { Material } from "@/api/material";
import MaterialFish from "./MaterialFish.vue";
import type { QuickFormulaMaterial } from "@/types/quickFormula";

const store = useQuickFormulaStore();
const materialStore = useMaterialStore();
const enumStore = useEnumStore();

const showAdvancedFilter = ref(false);
const viewMode = ref<"grid" | "pool">("grid");

onMounted(() => {
  if (materialStore.allMaterials.length === 0) {
    materialStore.fetchAllForSelect();
  }
  if (!enumStore.loaded) {
    enumStore.fetchEnums();
  }
});

const appearanceOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("appearance")
);

const tasteOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("taste")
);

const efficacyOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("efficacy")
);

const activeAdvancedCount = computed(() => {
  let count = 0;
  if (store.poolFilter.appearance.length > 0) count++;
  if (store.poolFilter.taste.length > 0) count++;
  if (store.poolFilter.efficacy.length > 0) count++;
  return count;
});

const hasAdvancedOptions = computed(() =>
  appearanceOptions.value.length > 0 || tasteOptions.value.length > 0 || efficacyOptions.value.length > 0
);

const filteredMaterials = computed<Material[]>(() => {
  const addedIds = new Set(store.formulaData.materials.map((m) => m.materialId));
  let pool = materialStore.allMaterials.filter((m: Material) => !addedIds.has(m.id));

  if (store.poolFilter.keyword) {
    const kw = store.poolFilter.keyword.toLowerCase();
    pool = pool.filter((m: Material) => m.name.toLowerCase().includes(kw));
  }

  if (store.poolFilter.type !== "all") {
    pool = pool.filter((m: Material) => m.materialType === store.poolFilter.type);
  }

  if (store.poolFilter.appearance.length > 0) {
    pool = pool.filter((m: Material) => {
      if (!m.appearance) return false;
      return store.poolFilter.appearance.some((v) => m.appearance!.includes(v));
    });
  }

  if (store.poolFilter.taste.length > 0) {
    pool = pool.filter((m: Material) => {
      if (!m.taste) return false;
      return store.poolFilter.taste.some((v) => m.taste!.includes(v));
    });
  }

  if (store.poolFilter.efficacy.length > 0) {
    pool = pool.filter((m: Material) => {
      if (!m.efficacy) return false;
      return store.poolFilter.efficacy.some((v) => m.efficacy!.includes(v));
    });
  }

  return pool;
});

const herbCount = computed(() => filteredMaterials.value.filter((m: Material) => m.materialType === "herb").length);
const supplementCount = computed(() => filteredMaterials.value.filter((m: Material) => m.materialType === "supplement").length);

function handleAdd(material: QuickFormulaMaterial) {
  store.addMaterial(material);
}

function clearFilter() {
  store.poolFilter.keyword = "";
  store.poolFilter.type = "all";
  store.poolFilter.appearance = [];
  store.poolFilter.taste = [];
  store.poolFilter.efficacy = [];
}

const disabledValues = computed(() => {
  const result: Record<string, Set<string>> = {
    appearance: new Set<string>(),
    taste: new Set<string>(),
    efficacy: new Set<string>(),
  };
  for (const field of ["appearance", "taste"] as const) {
    const selected = store.poolFilter[field];
    for (const val of selected) {
      const excluded = enumStore.getExcludedValues(field, val);
      for (const ex of excluded) {
        result[field].add(ex);
      }
    }
  }
  return result;
});

function getDisabledTooltip(field: "appearance" | "taste" | "efficacy", value: string): string {
  const disabled = disabledValues.value[field];
  if (!disabled.has(value)) return "";
  const selected = store.poolFilter[field];
  const conflictingValues: string[] = [];
  for (const sel of selected) {
    const excluded = enumStore.getExcludedValues(field, sel);
    if (excluded.has(value)) {
      conflictingValues.push(sel);
    }
  }
  if (conflictingValues.length === 0) return "";
  return `与已选「${conflictingValues.join("」「")}」互斥`;
}

function toggleMultiFilter(field: "appearance" | "taste" | "efficacy", value: string) {
  const arr = store.poolFilter[field];
  const idx = arr.indexOf(value);
  if (idx === -1) {
    arr.push(value);
    const excluded = enumStore.getExcludedValues(field, value);
    if (excluded.size > 0) {
      for (const exVal of excluded) {
        const exIdx = arr.indexOf(exVal);
        if (exIdx !== -1) {
          arr.splice(exIdx, 1);
        }
      }
    }
  } else {
    arr.splice(idx, 1);
  }
}

function removeAdvancedFilter(field: "appearance" | "taste" | "efficacy", value: string) {
  toggleMultiFilter(field, value);
}

// === 自由游动引擎（Boid 模型 + 矩形包围盒碰撞 + 边界软转向 + 漂移扰动） ===
// 行为规则：
//  1) 分离：邻居过近时沿连线反向推开，避免矩形 AABB 重叠
//  2) 对齐：与局部邻居速度方向趋同，形成鱼群同步
//  3) 聚合：被邻居群体中心柔和吸引，让鱼群"抱团"游动
//  4) 边界软避：靠近边缘时给一个垂直边缘的转向力，提前转弯
//  5) 漂移：每条鱼有独立的"巡航偏好"角度，随时间缓慢漂移
//  6) 抖动：每帧叠加极小随机扰动，避免轨迹呈完美直线/弧
// 碰撞模型：把每条鱼视作 (halfW, halfH) 的矩形包围盒，碰撞判断基于 AABB
interface FishState {
  id: string
  x: number  // 鱼中心 x (px, container 坐标系)
  y: number  // 鱼中心 y
  vx: number
  vy: number
  /** 鱼卡片半宽 = 鱼包围盒 x 半径（按鱼名长度分桶） */
  halfW: number
  /** 鱼卡片半高 */
  halfH: number
  /** 个体巡航偏好角度（随时间缓慢漂移） */
  preferredAngle: number
  /** 用于相位偏移的随机种子 */
  phase: number
}

// 鱼名字长度 → 包围盒尺寸（与 .material-fish 样式保持一致）
// 卡片：padding 2*4 + 名字宽度(11px * 字数) + 8px 间隔 + 标签(主料/辅料 9px*2 + 2*2 padding) + 1*2 border
function getFishSize(name: string): { halfW: number; halfH: number } {
  const len = name.length
  // 与 .fish-body 实际渲染宽度对应 (实测 66/77/88/95/96)
  // 半宽 = 渲染宽度 / 2，再加一点间距让相邻鱼有视觉空隙
  let w: number
  if (len <= 2) w = 36       // 2 字
  else if (len === 3) w = 42  // 3 字
  else if (len === 4) w = 48  // 4 字
  else if (len === 5) w = 52  // 5 字
  else w = 55                 // 6+ 字
  return { halfW: w, halfH: 14 }
}

const fishStates = ref<Map<string, FishState>>(new Map())
const fishPositions = ref<Map<string, { x: number; y: number }>>(new Map())
const poolAreaRef = ref<HTMLElement | null>(null)
const containerW = ref(0)
const containerH = ref(0)
let rafId: number | null = null
let lastFrameTime = 0

const EDGE_PADDING = 4
const MIN_SPEED = 5
const MAX_SPEED = 14
/** 鱼之间最小像素间隙（在矩形外面留出的空白） */
const MIN_GAP = 6

// 自适应包围盒安全半径：保证鱼之间矩形不重叠
// 鱼半径 = max(halfW) + min_gap，用作"个人空间"
function getMaxHalfW(states: Map<string, FishState> | FishState[]): number {
  let maxW = 30
  const arr = Array.isArray(states) ? states : Array.from(states.values())
  for (const s of arr) {
    if (s.halfW > maxW) maxW = s.halfW
  }
  return maxW
}

// 理论上的最大半径（用最大鱼宽度估算）
function getTheoreticalMaxRadius(count: number, w: number, h: number): number {
  if (count === 0) return 0
  // 矩形堆叠利用率 0.7（圆形的话 ~0.9）
  return Math.sqrt((w * h) / count) * 0.6
}

// 邻居感知半径：通常 1.5~2x 个人空间
function getNeighborRadius(radius: number): number {
  return radius * 2.2
}

// Poisson-Disk 风格的初始位置：拒绝采样，确保每条鱼矩形都不重叠
function findSpawnPosition(
  existing: FishState[],
  candidate: { halfW: number; halfH: number },
  w: number,
  h: number,
  maxAttempts = 80,
): { x: number; y: number } {
  const gap = MIN_GAP
  const minX = EDGE_PADDING + candidate.halfW
  const maxX = w - EDGE_PADDING - candidate.halfW
  const minY = EDGE_PADDING + candidate.halfH
  const maxY = h - EDGE_PADDING - candidate.halfH
  if (maxX <= minX || maxY <= minY) {
    return { x: w / 2, y: h / 2 }
  }
  for (let i = 0; i < maxAttempts; i++) {
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    let ok = true
    for (const s of existing) {
      // AABB 重叠判定（中心点距离 < halfW 之和 + gap 且 halfH 方向也重叠）
      const dx = Math.abs(s.x - x)
      const dy = Math.abs(s.y - y)
      const minDx = s.halfW + candidate.halfW + gap
      const minDy = s.halfH + candidate.halfH + gap
      if (dx < minDx && dy < minDy) {
        ok = false
        break
      }
    }
    if (ok) return { x, y }
  }
  // 实在找不到空位时，网格回退
  return { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) }
}

function initFishStates(materials: Material[], w: number, h: number) {
  const map = new Map<string, FishState>()
  const placed: FishState[] = []
  for (const m of materials) {
    const { halfW, halfH } = getFishSize(m.name)
    const pos = findSpawnPosition(placed, { halfW, halfH }, w, h)
    // 初始速度完全随机方向 + 中等速度，让鱼群初看不整齐
    const angle = Math.random() * Math.PI * 2
    const speed = (MIN_SPEED + MAX_SPEED) / 2 + (Math.random() - 0.5) * 4
    // 偏好角与初始角相近，初始阶段方向不那么"齐"
    const preferred = angle + (Math.random() - 0.5) * 0.6
    const phase = Math.random() * Math.PI * 2
    const s: FishState = {
      id: m.id,
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      halfW,
      halfH,
      preferredAngle: preferred,
      phase,
    }
    map.set(m.id, s)
    placed.push(s)
  }
  fishStates.value = map
  // 同步位置
  const posMap = new Map<string, { x: number; y: number }>()
  map.forEach((s, id) => posMap.set(id, { x: s.x, y: s.y }))
  fishPositions.value = posMap
}

function measureContainer() {
  if (!poolAreaRef.value) return
  const rect = poolAreaRef.value.getBoundingClientRect()
  containerW.value = rect.width
  containerH.value = rect.height
}

function startAnimation() {
  if (rafId !== null) return
  lastFrameTime = performance.now()
  let elapsed = 0
  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick)
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05)  // 限制最大 50ms 防止跳变
    lastFrameTime = now
    elapsed += dt

    if (containerW.value === 0 || containerH.value === 0) {
      measureContainer()
      if (containerW.value === 0) return
    }

    const states = fishStates.value
    if (states.size === 0) return

    const W = containerW.value
    const H = containerH.value
    const maxHalfW = getMaxHalfW(states)
    const radius = maxHalfW + MIN_GAP
    const neighborR = getNeighborRadius(radius)
    const neighborR2 = neighborR * neighborR

    // === 0. 巡航偏好角缓慢漂移（每条鱼独立周期） ===
    states.forEach((s) => {
      // 周期 ~4-8 秒
      const drift = Math.sin(elapsed * (0.3 + (s.phase % 1) * 0.4) + s.phase) * 0.0035 * dt * 60
      s.preferredAngle += drift
    })

    // === 1. 计算每条鱼的目标转向力（Boid + 边界 + 偏好） ===
    const arr = Array.from(states.values())
    const steerings: { ax: number; ay: number }[] = arr.map((s) => {
      let sepX = 0, sepY = 0
      let aliX = 0, aliY = 0
      let cohX = 0, cohY = 0
      let sepCount = 0
      let neighborCount = 0
      for (const o of arr) {
        if (o === s) continue
        const dx = o.x - s.x
        const dy = o.y - s.y
        const d2 = dx * dx + dy * dy
        if (d2 > neighborR2 || d2 === 0) continue
        neighborCount++
        // 聚合：累加邻居位置
        cohX += o.x
        cohY += o.y
        // 对齐：累加邻居速度
        aliX += o.vx
        aliY += o.vy
        // 分离：基于两鱼 AABB 推开
        //   - 重叠开始距离 = halfW 之和 + MIN_GAP（沿 x）
        //   - 重叠开始距离 = halfH 之和 + MIN_GAP（沿 y）
        //   - 在矩形重叠区，沿重叠最深的轴方向推开
        const minSepX = s.halfW + o.halfW + MIN_GAP
        const minSepY = s.halfH + o.halfH + MIN_GAP
        const overlapX = minSepX - Math.abs(dx)
        const overlapY = minSepY - Math.abs(dy)
        if (overlapX > 0 && overlapY > 0) {
          // 推开方向：远离邻居（在重叠轴上）
          const signX = dx >= 0 ? 1 : -1
          const signY = dy >= 0 ? 1 : -1
          // 用重叠深度归一化（0~1），重叠越深推开力越大
          if (overlapX < overlapY) {
            // 主要沿 x 推开
            const w = overlapX / minSepX  // 0~1
            sepX += signX * w
            sepY += signY * w * 0.15  // y 方向也轻微给一点
          } else {
            // 主要沿 y 推开
            const w = overlapY / minSepY
            sepY += signY * w
            sepX += signX * w * 0.15
          }
          sepCount++
        }
      }

      let ax = 0
      let ay = 0

      // 分离力（最重要，且要强）—— 累加重叠深度，避免单位向量归一化掩盖力大小
      if (sepCount > 0) {
        ax += sepX * 12.0
        ay += sepY * 12.0
      }

      // 对齐力
      if (neighborCount > 0) {
        aliX /= neighborCount
        aliY /= neighborCount
        const aliLen = Math.hypot(aliX, aliY)
        if (aliLen > 0.0001) {
          ax += (aliX / aliLen) * 0.5
          ay += (aliY / aliLen) * 0.5
        }
        // 聚合：朝向邻居中心
        cohX /= neighborCount
        cohY /= neighborCount
        const cdx = cohX - s.x
        const cdy = cohY - s.y
        const cohLen = Math.hypot(cdx, cdy)
        if (cohLen > 0.0001) {
          ax += (cdx / cohLen) * 0.15
          ay += (cdy / cohLen) * 0.15
        }
      }

      // 边界软避：距离边缘 < radius*3 时开始转向
      const turnMargin = radius * 3
      if (s.x < EDGE_PADDING + s.halfW + turnMargin) {
        ax += (1 - (s.x - EDGE_PADDING - s.halfW) / turnMargin) * 4.0
      } else if (s.x > W - EDGE_PADDING - s.halfW - turnMargin) {
        ax -= (1 - (W - EDGE_PADDING - s.halfW - s.x) / turnMargin) * 4.0
      }
      if (s.y < EDGE_PADDING + s.halfH + turnMargin) {
        ay += (1 - (s.y - EDGE_PADDING - s.halfH) / turnMargin) * 4.0
      } else if (s.y > H - EDGE_PADDING - s.halfH - turnMargin) {
        ay -= (1 - (H - EDGE_PADDING - s.halfH - s.y) / turnMargin) * 4.0
      }

      // 巡航偏好：朝 preferredAngle 方向的力
      ax += Math.cos(s.preferredAngle) * 0.3
      ay += Math.sin(s.preferredAngle) * 0.3

      // 极小随机扰动（避免轨迹完全可预测）
      ax += (Math.random() - 0.5) * 0.3
      ay += (Math.random() - 0.5) * 0.3

      return { ax, ay }
    })

    // === 2. 应用转向力 + 速度限幅 + 位置更新 + 硬边界兜底 ===
    arr.forEach((s, i) => {
      const st = steerings[i]
      // 加速度（px/s²），以 dt 推进
      s.vx += st.ax * dt * 60
      s.vy += st.ay * dt * 60

      // 速度大小限幅在 [MIN_SPEED, MAX_SPEED]
      const speed = Math.hypot(s.vx, s.vy)
      if (speed > MAX_SPEED) {
        s.vx = (s.vx / speed) * MAX_SPEED
        s.vy = (s.vy / speed) * MAX_SPEED
      } else if (speed < MIN_SPEED) {
        // 极慢时拉回到最小速度（保持方向）
        if (speed > 0.0001) {
          s.vx = (s.vx / speed) * MIN_SPEED
          s.vy = (s.vy / speed) * MIN_SPEED
        } else {
          const ang = s.preferredAngle
          s.vx = Math.cos(ang) * MIN_SPEED
          s.vy = Math.sin(ang) * MIN_SPEED
        }
      }

      // 推进位置
      s.x += s.vx * dt
      s.y += s.vy * dt

      // 硬边界：超出时回弹（兜底，主要靠上面软避）
      const minX = EDGE_PADDING + s.halfW
      const maxX = W - EDGE_PADDING - s.halfW
      const minY = EDGE_PADDING + s.halfH
      const maxY = H - EDGE_PADDING - s.halfH
      if (s.x < minX) {
        s.x = minX
        s.vx = Math.abs(s.vx) * 0.8
      } else if (s.x > maxX) {
        s.x = maxX
        s.vx = -Math.abs(s.vx) * 0.8
      }
      if (s.y < minY) {
        s.y = minY
        s.vy = Math.abs(s.vy) * 0.8
      } else if (s.y > maxY) {
        s.y = maxY
        s.vy = -Math.abs(s.vy) * 0.8
      }
    })

    // === 3. 软分离：兜底修正 AABB 重叠（碰撞后位置推开）===
    // 用 AABB 推开（按轴向分别计算 penetration）
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i]
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const minDxSep = a.halfW + b.halfW + MIN_GAP
        const minDySep = a.halfH + b.halfH + MIN_GAP
        const overlapX = minDxSep - Math.abs(dx)
        const overlapY = minDySep - Math.abs(dy)
        if (overlapX > 0 && overlapY > 0) {
          // 沿重叠最小的轴推开（避免推到边缘外）
          if (overlapX < overlapY) {
            const signX = dx >= 0 ? 1 : -1
            // 一边推一份（按位置远近分摊）
            const push = overlapX * 0.5
            a.x -= signX * push
            b.x += signX * push
            // 强制把两鱼速度分开（避免下一帧又撞）
            const dv = b.vx - a.vx
            if (dv * signX > 0) {
              // 速度方向在推动方向上有重叠，需要让 a 加速向外，b 反之
              const k = Math.min(Math.abs(dv), MAX_SPEED) * 0.6
              a.vx -= signX * k
              b.vx += signX * k
            }
          } else {
            const signY = dy >= 0 ? 1 : -1
            const push = overlapY * 0.5
            a.y -= signY * push
            b.y += signY * push
            const dv = b.vy - a.vy
            if (dv * signY > 0) {
              const k = Math.min(Math.abs(dv), MAX_SPEED) * 0.6
              a.vy -= signY * k
              b.vy += signY * k
            }
          }
        }
      }
    }

    // === 4. 同步到鱼组件用的位置 map（加入小幅 Y 浮动模拟游动） ===
    const newPos = new Map<string, { x: number; y: number }>()
    states.forEach((s, id) => {
      const wobble = Math.sin(elapsed * 2.2 + s.phase) * 2.2
      newPos.set(id, { x: s.x, y: s.y + wobble })
    })
    fishPositions.value = newPos
  }
  rafId = requestAnimationFrame(tick)
}

function stopAnimation() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// 监听模式切换：进入 pool 模式时启动引擎 + 初始化鱼位置
watch(viewMode, async (mode) => {
  if (mode === "pool") {
    await nextTick()
    measureContainer()
    initFishStates(filteredMaterials.value, containerW.value, containerH.value)
    startAnimation()
  } else {
    stopAnimation()
  }
})

// 当鱼列表变化时重新初始化
watch(filteredMaterials, async (mats) => {
  if (viewMode.value === "pool" && containerW.value > 0) {
    initFishStates(mats, containerW.value, containerH.value)
  }
}, { deep: false })

// 当容器尺寸变化（如窗口 resize）时重置边界
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (poolAreaRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (viewMode.value === "pool") {
        measureContainer()
      }
    })
    resizeObserver.observe(poolAreaRef.value)
  }
})

onBeforeUnmount(() => {
  stopAnimation()
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

const typeOptions = [
  { label: "全部", value: "all" },
  { label: "主料", value: "herb" },
  { label: "辅料", value: "supplement" },
] as const;
</script>

<template>
  <div class="material-pool">
    <div class="pool-filter">
      <div class="filter-top-row">
        <t-input v-model="store.poolFilter.keyword" placeholder="搜索原料" clearable size="small" class="filter-search">
          <template #prefix-icon>
            <t-icon name="search" />
          </template>
        </t-input>
        <t-button variant="text" size="small" @click="clearFilter" class="filter-reset">
          <template #icon><t-icon name="refresh" /></template>
          重置
        </t-button>
        <div class="filter-top-actions">
          <button class="view-toggle-btn" :class="{ active: viewMode === 'grid' }" title="网格排列"
            @click="viewMode = 'grid'">
            <t-icon name="view-module" size="16px" />
          </button>
          <button class="view-toggle-btn" :class="{ active: viewMode === 'pool' }" title="自由游动"
            @click="viewMode = 'pool'">
            <t-icon name="fish" size="16px" />
          </button>
        </div>
      </div>

      <div class="filter-row">
        <span class="filter-label">类型</span>
        <div class="filter-tags">
          <button v-for="opt in typeOptions" :key="opt.value" class="tag-btn"
            :class="{ 'tag-btn--active': store.poolFilter.type === opt.value }"
            @click="store.poolFilter.type = opt.value">
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="activeAdvancedCount > 0" class="active-filters">
        <template v-if="store.poolFilter.appearance.length > 0">
          <span v-for="v in store.poolFilter.appearance" :key="'app-' + v" class="active-filter-tag"
            @click="removeAdvancedFilter('appearance', v)">
            {{ v }} <t-icon name="close" size="10px" />
          </span>
        </template>
        <template v-if="store.poolFilter.taste.length > 0">
          <span v-for="v in store.poolFilter.taste" :key="'taste-' + v" class="active-filter-tag"
            @click="removeAdvancedFilter('taste', v)">
            {{ v }} <t-icon name="close" size="10px" />
          </span>
        </template>
        <template v-if="store.poolFilter.efficacy.length > 0">
          <span v-for="v in store.poolFilter.efficacy" :key="'eff-' + v" class="active-filter-tag"
            @click="removeAdvancedFilter('efficacy', v)">
            {{ v }} <t-icon name="close" size="10px" />
          </span>
        </template>
      </div>

      <button v-if="hasAdvancedOptions" class="advanced-toggle" @click="showAdvancedFilter = !showAdvancedFilter">
        <t-icon :name="showAdvancedFilter ? 'chevron-up' : 'chevron-down'" size="14px" />
        高级筛选
        <span v-if="activeAdvancedCount > 0" class="advanced-count">{{ activeAdvancedCount }}</span>
      </button>

      <div v-if="showAdvancedFilter" class="advanced-filters">
        <div v-if="appearanceOptions.length > 0" class="filter-row">
          <span class="filter-label">性状</span>
          <div class="filter-tags">
            <button v-for="opt in appearanceOptions" :key="opt.value" class="tag-btn"
              :class="{
                'tag-btn--active': store.poolFilter.appearance.includes(opt.value),
                'tag-btn--disabled': disabledValues.appearance.has(opt.value)
              }"
              :disabled="disabledValues.appearance.has(opt.value)"
              :title="getDisabledTooltip('appearance', opt.value)"
              @click="toggleMultiFilter('appearance', opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="tasteOptions.length > 0" class="filter-row">
          <span class="filter-label">口感</span>
          <div class="filter-tags">
            <button v-for="opt in tasteOptions" :key="opt.value" class="tag-btn"
              :class="{
                'tag-btn--active': store.poolFilter.taste.includes(opt.value),
                'tag-btn--disabled': disabledValues.taste.has(opt.value)
              }"
              :disabled="disabledValues.taste.has(opt.value)"
              :title="getDisabledTooltip('taste', opt.value)"
              @click="toggleMultiFilter('taste', opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="efficacyOptions.length > 0" class="filter-row">
          <span class="filter-label">功效</span>
          <div class="filter-tags">
            <button v-for="opt in efficacyOptions" :key="opt.value" class="tag-btn"
              :class="{ 'tag-btn--active': store.poolFilter.efficacy.includes(opt.value) }"
              @click="toggleMultiFilter('efficacy', opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="pool-counter">
      <span class="counter-item">
        <span class="counter-dot counter-dot--herb"></span>
        主料 <strong>{{ herbCount }}</strong>
      </span>
      <span class="counter-item">
        <span class="counter-dot counter-dot--supplement"></span>
        辅料 <strong>{{ supplementCount }}</strong>
      </span>
      <span class="counter-total">共 {{ filteredMaterials.length }} 项</span>
    </div>

    <div class="pool-content">
      <div ref="poolAreaRef" class="pool-area">
        <template v-if="filteredMaterials.length > 0">
          <div v-if="viewMode === 'grid'" class="pool-materials">
            <MaterialFish v-for="material in filteredMaterials" :key="material.id" :material="material"
              @add="handleAdd" />
          </div>
          <div v-else class="pool-free">
            <MaterialFish v-for="material in filteredMaterials" :key="material.id" :material="material"
              :free-move="true" :free-pos="fishPositions.get(material.id)" @add="handleAdd" />
          </div>
        </template>
        <div v-else class="pool-empty">
          <t-icon name="search" class="pool-empty-icon" />
          <span class="pool-empty-text">没有匹配的原料</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.material-pool {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pool-filter {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3;
  background: var(--color-bg-container);
  border-radius: $radius-3xl $radius-3xl 0 0;
  border: 1px solid var(--color-border-light);
  border-bottom: none;

  .filter-search {
    flex: 1;
  }
}

.filter-top-row {
  display: flex;
  gap: $space-2;
  align-items: center;
}

.filter-top-actions {
  display: flex;
  gap: $space-0-5;
  flex-shrink: 0;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: $radius-md;
  background: var(--color-bg-container);
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $emerald-500;
    color: $emerald-500;
  }

  &.active {
    background: $overlay-emerald-08;
    border-color: $emerald-500;
    color: $emerald-500;
  }
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: $space-2;
}

.filter-label {
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
  line-height: 26px;
  min-width: 28px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
  flex: 1;
  min-width: 0;
}

.tag-btn {
  padding: $space-0-5 $space-2;
  border: 1px solid var(--color-border);
  border-radius: $radius-pill;
  background: var(--color-bg-container);
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;
  line-height: 1.4;

  &:hover {
    border-color: $emerald-500;
    color: $emerald-500;
  }

  &--active {
    background: $overlay-emerald-10;
    border-color: $emerald-500;
    color: $emerald-600;
    font-weight: $font-weight-semibold;
  }

  &:disabled,
  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: auto;

    &:hover {
      border-color: var(--color-border);
      color: var(--color-text-placeholder);
    }
  }
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
}

.active-filter-tag {
  display: inline-flex;
  align-items: center;
  gap: $space-0-5;
  padding: $space-0-5 $space-1-5;
  background: $overlay-emerald-08;
  border-radius: $radius-pill;
  font-size: $font-size-micro;
  color: $emerald-600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $overlay-emerald-15;
  }
}

.advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  padding: $space-0-5 0;
  border: none;
  background: transparent;
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: $emerald-500;
  }
}

.advanced-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 $space-0-5;
  border-radius: $radius-circle;
  background: $emerald-500;
  color: $text-white;
  font-size: 10px;
  font-weight: $font-weight-bold;
  line-height: 1;
}

.advanced-filters {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding-top: $space-2;
  border-top: 1px solid var(--color-border-light);
}

.filter-reset {
  flex-shrink: 0;
}

.pool-counter {
  display: flex;
  align-items: center;
  gap: $space-2-5;
  padding: $space-1-5 $space-3;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-top: none;
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.counter-item {
  display: inline-flex;
  align-items: center;
  gap: $space-1;

  strong {
    color: var(--color-text-secondary);
    font-weight: $font-weight-bold;
  }
}

.counter-dot {
  width: 6px;
  height: 6px;
  border-radius: $radius-circle;
  flex-shrink: 0;

  &--herb {
    background: $emerald-500;
  }

  &--supplement {
    background: $color-warning;
  }
}

.counter-total {
  margin-left: auto;
  font-size: $font-size-micro;
  color: var(--color-text-placeholder);
}

.pool-content {
  flex: 1;
  display: flex;
  min-height: 0;
  border: 1px solid var(--color-border-light);
  border-top: none;
  border-radius: 0 0 $radius-3xl $radius-3xl;
  overflow: hidden;
}

.pool-area {
  flex: 1;
  overflow-y: auto;
  padding: $space-3 $space-3 $space-6 $space-3;
  background: linear-gradient(180deg,
      var(--color-bg-container, #fff) 0%,
      var(--color-bg-container, #fff) 100%);
  min-height: 400px;
  position: relative;
}

.pool-materials {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.pool-free {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
}

.pool-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: $space-3;

  .pool-empty-icon {
    font-size: 40px;
    color: var(--color-text-placeholder);
  }

  .pool-empty-text {
    font-size: $font-size-body-sm;
    color: var(--color-text-placeholder);
  }
}
</style>
