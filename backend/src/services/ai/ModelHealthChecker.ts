import crypto from 'node:crypto'
import { query, execute } from '../../config/database-adapter.js';
import { aiService } from './AIService.js'

export class ModelHealthChecker {
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false

  start(): void {
    console.log('[HealthChecker] 启动模型健康检测服务')
    this.scheduleNext()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.running = false
    console.log('[HealthChecker] 健康检测服务已停止')
  }

  private scheduleNext(): void {
    this.timer = setTimeout(async () => {
      if (!this.running) {
        this.running = true
        try {
          await this.checkAll()
        } catch (err) {
          console.error('[HealthChecker] 检测异常:', err)
        }
        this.running = false
      }
      this.scheduleNext()
    }, 60 * 60 * 1000)
  }

  async checkAll(): Promise<void> {
    try {
      
      const models = (await query('SELECT * FROM ai_models WHERE api_key != ""', [])).rows as any[]

      for (const model of models) {
        const intervalDays = model.health_check_interval_days || 1
        if (model.last_health_check) {
          const lastCheck = new Date(model.last_health_check)
          const nextCheck = new Date(lastCheck.getTime() + intervalDays * 86400000)
          if (new Date() < nextCheck) continue
        }

        await this.checkOne(model)
      }
    } catch (err) {
      console.error('[HealthChecker] checkAll 失败:', err)
    }
  }

  async checkOne(model: any): Promise<void> {
    const start = Date.now()
    const now = new Date().toISOString()
    

    try {
      await aiService.chatCompletion(model.provider, [
        { role: 'user', content: 'hi' },
      ], { maxTokens: 5, temperature: 0, callType: 'health_check' })

      const latencyMs = Date.now() - start
      await execute("UPDATE ai_models SET health_status = 'healthy', last_health_check = ?, last_health_latency = ?, updated_at = ? WHERE id = ?", [now, latencyMs, now, model.id])

      await execute(`
        INSERT INTO ai_health_records (id, provider, status, latency_ms, checked_at)
        VALUES (?, ?, 'healthy', ?, ?)
      `, [`hr_${crypto.randomUUID(]).slice(0, 8)}`, model.provider, latencyMs, now)

      console.log(`[HealthChecker] ${model.name} (${model.provider}): healthy, ${latencyMs}ms`)
    } catch (err: any) {
      const latencyMs = Date.now() - start
      await execute("UPDATE ai_models SET health_status = 'unhealthy', last_health_check = ?, last_health_latency = ?, updated_at = ? WHERE id = ?", [now, latencyMs, now, model.id])

      await execute(`
        INSERT INTO ai_health_records (id, provider, status, latency_ms, error_message, checked_at)
        VALUES (?, ?, 'unhealthy', ?, ?, ?)
      `, [`hr_${crypto.randomUUID(]).slice(0, 8)}`, model.provider, latencyMs, err.message?.substring(0, 200), now)

      console.warn(`[HealthChecker] ${model.name} (${model.provider}): unhealthy - ${err.message}`)
    }
  }
}

export const modelHealthChecker = new ModelHealthChecker()
