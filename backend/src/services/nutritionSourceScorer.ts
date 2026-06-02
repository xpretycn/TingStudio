// 营养来源评分服务
// 算法：高可信(50%) + 时效性(30%) + 匹配度(20%) 加权评分
// 用于在多源对比页面推荐最优来源

export interface SourceScoreInput {
  sourceId: string
  confidence: 'high' | 'medium' | 'low'
  createdAt: string
  matchScore: number | null
  isActive: number
}

export interface ScoredSource extends SourceScoreInput {
  totalScore: number
  confScore: number
  recencyScore: number
  matchScoreNorm: number
  rank: number
}

const WEIGHTS = {
  confidence: 0.5,
  recency: 0.3,
  match: 0.2,
}

const CONFIDENCE_SCORES: Record<string, number> = {
  high: 100,
  medium: 60,
  low: 30,
}

const MAX_AGE_DAYS = 365

export function scoreSources(sources: SourceScoreInput[]): ScoredSource[] {
  const now = Date.now()

  const scored = sources.map((s) => {
    const confScore = CONFIDENCE_SCORES[s.confidence] ?? 50

    const createdAtMs = new Date(s.createdAt).getTime()
    const ageDays = (now - createdAtMs) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 100 - (ageDays / MAX_AGE_DAYS) * 100)

    const matchScoreNorm = s.matchScore ?? 70

    const totalScore =
      confScore * WEIGHTS.confidence +
      recencyScore * WEIGHTS.recency +
      matchScoreNorm * WEIGHTS.match

    return {
      ...s,
      totalScore: Math.round(totalScore * 10) / 10,
      confScore,
      recencyScore: Math.round(recencyScore * 10) / 10,
      matchScoreNorm,
    }
  })

  scored.sort((a, b) => b.totalScore - a.totalScore)

  return scored.map((s, i) => ({ ...s, rank: i + 1 }))
}

export function recommendAuthoritative(sources: SourceScoreInput[]): ScoredSource | null {
  const active = sources.filter((s) => s.isActive === 1)
  if (active.length === 0) return null
  const ranked = scoreSources(active)
  return ranked[0] ?? null
}

export function recommendByStrategy(
  sources: SourceScoreInput[],
  strategy: 'best-deviation' | 'manual' | 'highest-confidence' | 'newest',
): ScoredSource | null {
  const active = sources.filter((s) => s.isActive === 1)
  if (active.length === 0) return null

  if (strategy === 'highest-confidence') {
    const sorted = [...active].sort((a, b) => {
      const ca = CONFIDENCE_SCORES[a.confidence] ?? 0
      const cb = CONFIDENCE_SCORES[b.confidence] ?? 0
      if (cb !== ca) return cb - ca
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    const top = sorted[0]
    return top ? scoreSources([top])[0] ?? null : null
  }

  if (strategy === 'newest') {
    const sorted = [...active].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const top = sorted[0]
    return top ? scoreSources([top])[0] ?? null : null
  }

  return recommendAuthoritative(active)
}
