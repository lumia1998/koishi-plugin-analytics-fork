import { $, Context, deepEqual, Dict, Logger, pick, Query, Row, Schema, Session, Time, Universal } from 'koishi'
import { DataService } from '@koishijs/console'
import { resolve } from 'path'

declare module 'koishi' {
  interface Tables {
    'analytics.message': Analytics.Message
    'analytics.command': Analytics.Command
  }
}

declare module '@koishijs/console' {
  namespace Console {
    interface Services {
      analytics: Analytics
    }
  }
}

export interface MessageStats {
  send: number
  receive: number
}

export interface ModelTokenUsage {
  model: string
  requests: number
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  totalTokens: number
}

export interface ModelTokenUsagePayload {
  day: ModelTokenUsage[]
  week: ModelTokenUsage[]
  month: ModelTokenUsage[]
}

export interface ModelUsageTrendPoint {
  date: number
  label: string
  requests: number
  totalTokens: number
}

export interface ModelUsageTrendSeries {
  model: string
  requests: number
  totalTokens: number
  points: ModelUsageTrendPoint[]
}

export interface ModelUsageTrendPayload {
  threeDays: ModelUsageTrendSeries[]
  week: ModelUsageTrendSeries[]
  month: ModelUsageTrendSeries[]
  all: ModelUsageTrendSeries[]
}

export interface ChatLunaUsageRangeStats {
  requests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  responseTimeSamples: number
  totalResponseTime: number
  averageResponseTime: number
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  totalTokens: number
}

export interface ChatLunaUsageRangePayload {
  day: ChatLunaUsageRangeStats
  week: ChatLunaUsageRangeStats
  month: ChatLunaUsageRangeStats
}

export interface ModelPerformanceStats {
  model: string
  requests: number
  avgTtftMs: number
  avgTps: number
}

export interface ModelPerformancePayload {
  day: ModelPerformanceStats[]
  week: ModelPerformanceStats[]
  month: ModelPerformanceStats[]
}

export interface ChatLunaUsageOverview {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  todayRequests: number
  weekRequests: number
  monthRequests: number
  updatedAt: string
  previous: ChatLunaUsageRangePayload
  day: ChatLunaUsageRangeStats
  week: ChatLunaUsageRangeStats
  month: ChatLunaUsageRangeStats
}

interface ChatLunaUsageRecord {
  model: string
  success?: boolean
  ttftMs?: number
  totalMs?: number
  tps?: number
  responseTime?: number | string
  responseTimeMs?: number | string
  response_time?: number | string
  response_time_ms?: number | string
  duration?: number | string
  durationMs?: number | string
  duration_ms?: number | string
  latency?: number | string
  latencyMs?: number | string
  latency_ms?: number | string
  elapsed?: number | string
  elapsedMs?: number | string
  elapsed_ms?: number | string
  responseSeconds?: number | string
  response_seconds?: number | string
  response_time_seconds?: number | string
  response_time_s?: number | string
  durationSeconds?: number | string
  duration_seconds?: number | string
  duration_s?: number | string
  latencySeconds?: number | string
  latency_seconds?: number | string
  latency_s?: number | string
  elapsedSeconds?: number | string
  elapsed_seconds?: number | string
  elapsed_s?: number | string
  usageMetadata?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
    input_token_details?: {
      cache_read?: number
      cache_creation?: number
    }
  }
  createdAt: Date
}

const logger = new Logger('analytics')
const MODEL_USAGE_LIMIT = 10
const MODEL_TREND_LIMIT = 6
const RESPONSE_TIME_FIELDS: readonly { name: keyof ChatLunaUsageRecord; unit?: 's' }[] = [
  { name: 'responseTime' },
  { name: 'responseTimeMs' },
  { name: 'response_time' },
  { name: 'response_time_ms' },
  { name: 'duration' },
  { name: 'durationMs' },
  { name: 'duration_ms' },
  { name: 'latency' },
  { name: 'latencyMs' },
  { name: 'latency_ms' },
  { name: 'elapsed' },
  { name: 'elapsedMs' },
  { name: 'elapsed_ms' },
  { name: 'responseSeconds', unit: 's' },
  { name: 'response_seconds', unit: 's' },
  { name: 'response_time_seconds', unit: 's' },
  { name: 'response_time_s', unit: 's' },
  { name: 'durationSeconds', unit: 's' },
  { name: 'duration_seconds', unit: 's' },
  { name: 'duration_s', unit: 's' },
  { name: 'latencySeconds', unit: 's' },
  { name: 'latency_seconds', unit: 's' },
  { name: 'latency_s', unit: 's' },
  { name: 'elapsedSeconds', unit: 's' },
  { name: 'elapsed_seconds', unit: 's' },
  { name: 'elapsed_s', unit: 's' },
] as const

function createEmptyUsageStats(): ChatLunaUsageRangeStats {
  return {
    requests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    successRate: 0,
    responseTimeSamples: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
  }
}

function createEmptyUsageRangePayload(): ChatLunaUsageRangePayload {
  return {
    day: createEmptyUsageStats(),
    week: createEmptyUsageStats(),
    month: createEmptyUsageStats(),
  }
}

function createEmptyUsageOverview(): ChatLunaUsageOverview {
  return {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    successRate: 0,
    todayRequests: 0,
    weekRequests: 0,
    monthRequests: 0,
    updatedAt: new Date().toISOString(),
    previous: createEmptyUsageRangePayload(),
    day: createEmptyUsageStats(),
    week: createEmptyUsageStats(),
    month: createEmptyUsageStats(),
  }
}

function addUsageStats(target: ChatLunaUsageRangeStats, row: ChatLunaUsageRecord) {
  target.requests += 1
  if (row.success) target.successfulRequests += 1
  else target.failedRequests += 1

  const responseTime = getResponseTime(row)
  if (responseTime !== undefined) {
    target.responseTimeSamples += 1
    target.totalResponseTime += responseTime
  }

  const metadata = row.success ? row.usageMetadata : undefined
  if (!metadata) return

  target.inputTokens += metadata?.input_tokens ?? 0
  target.outputTokens += metadata?.output_tokens ?? 0
  target.cachedTokens += (metadata?.input_token_details?.cache_read ?? 0) + (metadata?.input_token_details?.cache_creation ?? 0)
  target.totalTokens += metadata?.total_tokens ?? 0
}

function createEmptyModelUsageStats(): Omit<ModelTokenUsage, 'model'> {
  return {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
  }
}

function addModelUsageStats(target: Omit<ModelTokenUsage, 'model'>, row: ChatLunaUsageRecord) {
  target.requests += 1

  const metadata = row.success ? row.usageMetadata : undefined
  if (!metadata) return

  target.inputTokens += metadata?.input_tokens ?? 0
  target.outputTokens += metadata?.output_tokens ?? 0
  target.cachedTokens += (metadata?.input_token_details?.cache_read ?? 0) + (metadata?.input_token_details?.cache_creation ?? 0)
  target.totalTokens += metadata?.total_tokens ?? 0
}

function sortModelUsage(a: ModelTokenUsage, b: ModelTokenUsage) {
  return b.totalTokens - a.totalTokens || b.requests - a.requests
}

function compactModelUsage(items: ModelTokenUsage[], limit: number) {
  const sorted = [...items].sort(sortModelUsage)
  if (sorted.length <= limit) return sorted

  const visibleCount = limit - 1
  const hiddenStats = sorted
    .slice(visibleCount)
    .reduce<ModelTokenUsage>((stats, item) => {
      stats.requests += item.requests
      stats.inputTokens += item.inputTokens
      stats.outputTokens += item.outputTokens
      stats.cachedTokens += item.cachedTokens
      stats.totalTokens += item.totalTokens
      return stats
    }, {
      model: '其他模型',
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    })

  return [
    ...sorted.slice(0, visibleCount),
    hiddenStats,
  ]
}

function finishUsageStats(stats: ChatLunaUsageRangeStats) {
  stats.successRate = stats.requests ? stats.successfulRequests / stats.requests : 0
  stats.averageResponseTime = stats.responseTimeSamples ? stats.totalResponseTime / stats.responseTimeSamples : 0
}

function getResponseTime(row: ChatLunaUsageRecord) {
  const record = row as unknown as Record<string, unknown>

  for (const field of RESPONSE_TIME_FIELDS) {
    const value = normalizeResponseTime(record[field.name], field.unit)
    if (value !== undefined) return value
  }
}

function normalizeResponseTime(value: unknown, unit?: 's') {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return undefined
    return unit === 's' ? value * 1000 : value
  }

  if (typeof value !== 'string') return undefined

  const match = value.trim().match(/^(\d+(?:\.\d+)?)(ms|s)?$/i)
  if (!match) return undefined

  const time = Number(match[1])
  if (!Number.isFinite(time) || time < 0) return undefined

  return unit === 's' || match[2]?.toLowerCase() === 's' ? time * 1000 : time
}

function getWeekStartDateNumber(today: number) {
  const day = Time.fromDateNumber(today).getDay()
  return today - (day === 0 ? 6 : day - 1)
}

function getMonthStartDateNumber(today: number) {
  const date = Time.fromDateNumber(today)
  return Time.getDateNumber(new Date(date.getFullYear(), date.getMonth(), 1))
}

function formatTrendDateLabel(dateNumber: number) {
  const date = Time.fromDateNumber(dateNumber)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}/${day}`
}

class Analytics extends DataService<Analytics.Payload> {
  static inject = ['database', 'console']

  lastUpdate = new Date()
  updateHour = this.lastUpdate.getHours()
  cachedDate: number
  cachedData: Promise<Analytics.Payload>

  private messages: Analytics.Message[] = []
  private commands: Analytics.Command[] = []

  constructor(ctx: Context, public config: Analytics.Config = {}) {
    super(ctx, 'analytics')

    ctx.model.extend('analytics.message', {
      date: 'integer',
      hour: 'integer',
      type: 'string(63)',
      selfId: 'string(63)',
      platform: 'string(63)',
      count: 'integer',
    }, {
      primary: ['date', 'hour', 'type', 'selfId', 'platform'],
    })

    ctx.model.extend('analytics.command', {
      date: 'integer',
      hour: 'integer',
      name: 'string(63)',
      selfId: 'string(63)',
      userId: 'integer',
      channelId: 'string(63)',
      platform: 'string(63)',
      count: 'integer',
    }, {
      primary: ['date', 'hour', 'name', 'selfId', 'userId', 'channelId', 'platform'],
    })

    ctx.on('exit', () => this.upload(true))

    ctx.on('dispose', async () => {
      await this.upload(true)
    })

    ctx.on('message', (session) => {
      this.addAudit(this.messages, {
        ...this.createIndex(session),
        type: 'receive',
      })
      this.upload()
    })

    ctx.on('send', (session) => {
      this.addAudit(this.messages, {
        ...this.createIndex(session),
        type: 'send',
      })
      this.upload()
    })

    ctx.any().before('command/execute', ({ command, session }) => {
      this.addAudit(this.commands, {
        ...this.createIndex(session),
        name: command.name,
        userId: session.user['id'] || 0,
        channelId: session.channelId,
      })
      this.upload()
    })

    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  }

  private createIndex(session: Session): Analytics.Index {
    return {
      selfId: session.selfId,
      platform: session.platform,
      date: Time.getDateNumber(),
      hour: new Date().getHours(),
    }
  }

  private addAudit<T extends Analytics.Audit>(buffer: T[], index: Omit<T, 'count'>) {
    const audit = buffer.find(data => deepEqual(pick(data, Object.keys(index) as (keyof T)[]), index))
    if (audit) {
      audit.count += 1
    } else {
      buffer.push({ ...index, count: 1 } as T)
    }
  }

  private async uploadAudit(table: string, buffer: Analytics.Audit[]) {
    if (!buffer.length) return
    await this.ctx.database.upsert(table as any, (row: Row<Analytics.Audit>) => buffer.map((audit) => ({
      ...audit,
      count: $.add($.ifNull(row.count, 0), audit.count),
    })))
    buffer.splice(0)
  }

  async upload(forced = false) {
    const date = new Date()
    const dateHour = date.getHours()
    if (forced || +date - +this.lastUpdate > this.config.statsInternal || dateHour !== this.updateHour) {
      this.lastUpdate = date
      this.updateHour = dateHour
      await Promise.all([
        this.uploadAudit('analytics.message', this.messages),
        this.uploadAudit('analytics.command', this.commands),
      ])
      this.cachedDate = undefined as any
      this.refresh()
      logger.debug('analytics updated')
    }
  }

  private queryRecent(): Query.FieldExpr<number> {
    return {
      $gte: Time.getDateNumber() - 30,
      $lte: Time.getDateNumber(),
    }
  }

  private async getCommandRate(lengthTask: Promise<number>) {
    const data = await this.ctx.database
      .select('analytics.command', {
        date: this.queryRecent(),
      })
      .groupBy(['name'], {
        count: row => $.sum(row.count),
      })
      .execute()
    const length = await lengthTask
    const result = {} as Dict<number>
    data.forEach((stat) => {
      result[stat.name] = stat.count / length
    })
    return result
  }

  private async getDauHistory() {
    const data = await this.ctx.database
      .select('analytics.command', {
        date: { $gte: Time.getDateNumber() - 30 },
        userId: { $gt: 0 },
      })
      .groupBy(['date'], {
        count: row => $.count(row.userId),
      })
      .execute()
    const result: number[] = new Array(31).fill(0)
    const today = Time.getDateNumber()
    data.forEach((stat) => {
      result[today - stat.date] = stat.count
    })
    return result
  }

  private async getMessageByBot(lengthTask: Promise<number>) {
    const data = await this.ctx.database
      .select('analytics.message', {
        date: this.queryRecent(),
      })
      .groupBy(['type', 'platform', 'selfId'], {
        count: row => $.sum(row.count),
      })
      .execute()
    const length = await lengthTask
    const result = {} as Dict<Dict<MessageStats & Universal.User>>
    data.forEach((stat) => {
      const entry = (result[stat.platform] ||= {})[stat.selfId] ||= {
        ...this.ctx.bots[`${stat.platform}:${stat.selfId}`]?.user,
        send: 0,
        receive: 0,
      }
      entry[stat.type] = stat.count / length
    })
    return result
  }

  private async getMessageByDate() {
    const data = await this.ctx.database
      .select('analytics.message', {
        date: { $lte: Time.getDateNumber() },
      })
      .groupBy(['type', 'date'], {
        count: row => $.sum(row.count),
      })
      .orderBy('date', 'desc')
      .execute()
    const today = Time.getDateNumber()
    const result: MessageStats[] = []
    data.forEach((stat) => {
      const entry = result[today - stat.date] ||= { send: 0, receive: 0 }
      entry[stat.type] = stat.count
    })
    for (let i = 0; i < result.length; i++) {
      result[i] ||= { send: 0, receive: 0 }
    }
    return result
  }

  private async getMessageByHour(lengthTask: Promise<number>) {
    const data = await this.ctx.database
      .select('analytics.message', {
        date: this.queryRecent(),
      })
      .groupBy(['type', 'hour'], {
        count: row => $.sum(row.count),
      })
      .execute()
    const length = await lengthTask
    const result = new Array(24).fill(null).map(() => ({ send: 0, receive: 0 }))
    data.forEach((stat) => {
      result[stat.hour][stat.type] = stat.count / length
    })
    return result
  }

  private async getMessageHistoryByHour() {
    const timeNow = new Date()
    const currentHour = timeNow.getHours()
    const currentDate = Time.getDateNumber()
    const yesterdayDate = currentDate - 1

    const data = await this.ctx.database
      .select('analytics.message', {
        date: { $gte: yesterdayDate, $lte: currentDate },
      })
      .groupBy(['type', 'date', 'hour'], {
        count: row => $.sum(row.count),
      })
      .execute()

    const result: MessageStats[] = new Array(24).fill(null).map(() => ({ send: 0, receive: 0 }))

    data.forEach((stat) => {
      let hoursAgo = 0
      if (stat.date === currentDate) {
        if (stat.hour > currentHour) return
        hoursAgo = currentHour - stat.hour
      } else if (stat.date === yesterdayDate) {
        if (stat.hour <= currentHour) return
        hoursAgo = currentHour + 24 - stat.hour
      } else {
        return
      }

      if (hoursAgo >= 0 && hoursAgo < 24) {
        result[hoursAgo][stat.type] += stat.count
      }
    })
    return result
  }

  private async getChatLunaUsageOverview(): Promise<ChatLunaUsageOverview> {
    const overview = createEmptyUsageOverview()
    const end = new Date()
    const today = Time.getDateNumber()
    const dayStart = Time.fromDateNumber(today)
    const previousDayStart = Time.fromDateNumber(today - 1)
    const weekStart = Time.fromDateNumber(today - 6)
    const previousWeekStart = Time.fromDateNumber(today - 13)
    const monthStart = Time.fromDateNumber(today - 29)
    const previousMonthStart = Time.fromDateNumber(today - 59)

    try {
      const [allRows, recentRows] = await Promise.all([
        this.ctx.database.get('chatluna_usage' as any, {}) as Promise<ChatLunaUsageRecord[]>,
        this.ctx.database.get('chatluna_usage' as any, {
          createdAt: { $gte: previousMonthStart, $lt: end },
        }) as Promise<ChatLunaUsageRecord[]>,
      ])

      overview.totalRequests = allRows.length
      for (const row of allRows) {
        if (row.success) overview.successfulRequests += 1
        else overview.failedRequests += 1
      }
      overview.successRate = overview.totalRequests ? overview.successfulRequests / overview.totalRequests : 0

      for (const row of recentRows) {
        const createdAt = +new Date(row.createdAt)
        if (createdAt >= +dayStart) {
          addUsageStats(overview.day, row)
        } else if (createdAt >= +previousDayStart && createdAt < +dayStart) {
          addUsageStats(overview.previous.day, row)
        }

        if (createdAt >= +weekStart) {
          addUsageStats(overview.week, row)
        } else if (createdAt >= +previousWeekStart && createdAt < +weekStart) {
          addUsageStats(overview.previous.week, row)
        }

        if (createdAt >= +monthStart) {
          addUsageStats(overview.month, row)
        } else if (createdAt >= +previousMonthStart && createdAt < +monthStart) {
          addUsageStats(overview.previous.month, row)
        }
      }

      for (const stats of [
        overview.day,
        overview.week,
        overview.month,
        overview.previous.day,
        overview.previous.week,
        overview.previous.month,
      ]) {
        finishUsageStats(stats)
      }

      overview.todayRequests = overview.day.requests
      overview.weekRequests = overview.week.requests
      overview.monthRequests = overview.month.requests
      overview.updatedAt = end.toISOString()
    } catch (error) {
      logger.debug(error)
    }

    return overview
  }

  private async getChatLunaModelUsage(): Promise<ModelTokenUsagePayload> {
    const end = new Date()
    const today = Time.getDateNumber()
    const ranges = {
      day: Time.fromDateNumber(today),
      week: Time.fromDateNumber(getWeekStartDateNumber(today)),
      month: Time.fromDateNumber(getMonthStartDateNumber(today)),
    }

    const collect = async (start: Date) => {
      try {
        const rows = await this.ctx.database.get('chatluna_usage' as any, {
          createdAt: { $gte: start, $lt: end },
        }) as ChatLunaUsageRecord[]
        const totals = new Map<string, Omit<ModelTokenUsage, 'model'>>()
        for (const row of rows) {
          const model = row.model || '未知模型'
          const stats = totals.get(model) ?? createEmptyModelUsageStats()
          addModelUsageStats(stats, row)
          totals.set(model, stats)
        }
        const items = [...totals.entries()]
          .map(([model, stats]) => ({ model, ...stats }))
          .filter(item => item.requests > 0)
        return compactModelUsage(items, MODEL_USAGE_LIMIT)
      } catch (error) {
        logger.debug(error)
        return []
      }
    }

    const [day, week, month] = await Promise.all([
      collect(ranges.day),
      collect(ranges.week),
      collect(ranges.month),
    ])

    return { day, week, month }
  }

  private async getChatLunaModelTrend(): Promise<ModelUsageTrendPayload> {
    const end = new Date()
    const today = Time.getDateNumber()
    const ranges = {
      threeDays: today - 2,
      week: getWeekStartDateNumber(today),
      month: getMonthStartDateNumber(today),
    }
    const earliestStart = Time.fromDateNumber(Math.min(...Object.values(ranges)))

    try {
      const [recentRows, allRows] = await Promise.all([
        this.ctx.database.get('chatluna_usage' as any, {
          createdAt: { $gte: earliestStart, $lt: end },
        }) as Promise<ChatLunaUsageRecord[]>,
        this.ctx.database.get('chatluna_usage' as any, {}) as Promise<ChatLunaUsageRecord[]>,
      ])

      const buildSeries = (rows: ChatLunaUsageRecord[], startDate: number): ModelUsageTrendSeries[] => {
        const dates: number[] = []
        for (let date = startDate; date <= today; date++) dates.push(date)

        const modelTotals = new Map<string, Omit<ModelTokenUsage, 'model'>>()
        const dateTotals = new Map<string, Map<number, Omit<ModelTokenUsage, 'model'>>>()

        for (const row of rows) {
          const date = Time.getDateNumber(new Date(row.createdAt))
          if (date < startDate || date > today) continue

          const model = row.model || '未知模型'
          const totalStats = modelTotals.get(model) ?? createEmptyModelUsageStats()
          addModelUsageStats(totalStats, row)
          modelTotals.set(model, totalStats)

          const modelDateTotals = dateTotals.get(model) ?? new Map<number, Omit<ModelTokenUsage, 'model'>>()
          const dateStats = modelDateTotals.get(date) ?? createEmptyModelUsageStats()
          addModelUsageStats(dateStats, row)
          modelDateTotals.set(date, dateStats)
          dateTotals.set(model, modelDateTotals)
        }

        const visibleModels = compactModelUsage(
          [...modelTotals.entries()].map(([model, stats]) => ({ model, ...stats })),
          MODEL_TREND_LIMIT,
        )

        return visibleModels.map(({ model, requests, totalTokens }) => {
          const modelDateTotals = dateTotals.get(model)
          const points = dates.map((date) => {
            if (model === '其他模型') {
              const hiddenModels = [...modelTotals.entries()]
                .map(([name, stats]) => ({ model: name, ...stats }))
                .sort(sortModelUsage)
                .slice(MODEL_TREND_LIMIT - 1)
                .map(item => item.model)
              const hiddenStats = hiddenModels.reduce<Omit<ModelTokenUsage, 'model'>>((stats, name) => {
                const item = dateTotals.get(name)?.get(date)
                if (!item) return stats
                stats.requests += item.requests
                stats.inputTokens += item.inputTokens
                stats.outputTokens += item.outputTokens
                stats.cachedTokens += item.cachedTokens
                stats.totalTokens += item.totalTokens
                return stats
              }, createEmptyModelUsageStats())
              return { date, label: formatTrendDateLabel(date), requests: hiddenStats.requests, totalTokens: hiddenStats.totalTokens }
            }

            const stats = modelDateTotals?.get(date)
            return { date, label: formatTrendDateLabel(date), requests: stats?.requests ?? 0, totalTokens: stats?.totalTokens ?? 0 }
          })

          return { model, requests, totalTokens, points }
        })
      }

      // for "all", compute startDate from earliest record
      let allStartDate = today
      for (const row of allRows) {
        const d = Time.getDateNumber(new Date(row.createdAt))
        if (d < allStartDate) allStartDate = d
      }

      return {
        threeDays: buildSeries(recentRows, ranges.threeDays),
        week: buildSeries(recentRows, ranges.week),
        month: buildSeries(recentRows, ranges.month),
        all: buildSeries(allRows, allStartDate),
      }
    } catch (error) {
      logger.debug(error)
      return { threeDays: [], week: [], month: [], all: [] }
    }
  }

  private async getChatLunaModelPerformance(): Promise<ModelPerformancePayload> {
    const end = new Date()
    const today = Time.getDateNumber()
    const ranges = {
      day: Time.fromDateNumber(today),
      week: Time.fromDateNumber(getWeekStartDateNumber(today)),
      month: Time.fromDateNumber(getMonthStartDateNumber(today)),
    }

    const collect = async (start: Date): Promise<ModelPerformanceStats[]> => {
      try {
        const rows = await this.ctx.database.get('chatluna_usage' as any, {
          createdAt: { $gte: start, $lt: end },
        }) as ChatLunaUsageRecord[]
        const modelStats = new Map<string, { ttftSum: number; ttftCount: number; tpsSum: number; tpsCount: number; requests: number }>()
        for (const row of rows) {
          const model = row.model || '未知模型'
          const stats = modelStats.get(model) ?? { ttftSum: 0, ttftCount: 0, tpsSum: 0, tpsCount: 0, requests: 0 }
          stats.requests++
          if (typeof row.ttftMs === 'number' && row.ttftMs > 0) {
            stats.ttftSum += row.ttftMs
            stats.ttftCount++
          }
          if (typeof row.tps === 'number' && row.tps > 0) {
            stats.tpsSum += row.tps
            stats.tpsCount++
          }
          modelStats.set(model, stats)
        }
        return [...modelStats.entries()]
          .map(([model, stats]) => ({
            model,
            requests: stats.requests,
            avgTtftMs: stats.ttftCount ? Math.round(stats.ttftSum / stats.ttftCount) : 0,
            avgTps: stats.tpsCount ? Math.round(stats.tpsSum / stats.tpsCount * 10) / 10 : 0,
          }))
          .sort((a, b) => b.requests - a.requests)
          .slice(0, 10)
      } catch (error) {
        logger.debug(error)
        return []
      }
    }

    const [day, week, month] = await Promise.all([
      collect(ranges.day),
      collect(ranges.week),
      collect(ranges.month),
    ])

    return { day, week, month }
  }

  async download(): Promise<Analytics.Payload> {
    const messageByDateTask = this.getMessageByDate()
    const lengthTask = messageByDateTask.then((data) => {
      return Math.min(Math.max(data.length - 1, 1), 30)
    })
    const [
      userCount,
      userIncrement,
      guildCount,
      guildIncrement,
      commandRate,
      dauHistory,
      messageByBot,
      messageByDate,
      messageByHour,
      messageHistoryByHour,
      chatlunaModelUsage,
      chatlunaModelTrend,
      chatlunaModelPerformance,
      chatlunaUsageOverview,
    ] = await Promise.all([
      this.ctx.database.eval('user', row => $.count(row.id)),
      this.ctx.database.eval('user', row => $.count(row.id), {
        createdAt: {
          $gte: Time.fromDateNumber(Time.getDateNumber() - 1),
          $lt: Time.fromDateNumber(Time.getDateNumber()),
        },
      }),
      this.ctx.database.eval('channel', row => $.sum(1), row => $.eq(row.id, row.guildId)),
      this.ctx.database.eval('channel', row => $.sum(1), row => $.and(
        $.eq(row.id, row.guildId),
        $.gte(row.createdAt, Time.fromDateNumber(Time.getDateNumber() - 1)),
        $.lt(row.createdAt, Time.fromDateNumber(Time.getDateNumber())),
      )),
      this.getCommandRate(lengthTask),
      this.getDauHistory(),
      this.getMessageByBot(lengthTask),
      messageByDateTask,
      this.getMessageByHour(lengthTask),
      this.getMessageHistoryByHour(),
      this.getChatLunaModelUsage(),
      this.getChatLunaModelTrend(),
      this.getChatLunaModelPerformance(),
      this.getChatLunaUsageOverview(),
    ])
    return {
      userCount,
      userIncrement,
      guildCount,
      guildIncrement,
      commandRate,
      dauHistory,
      messageByBot,
      messageByDate,
      messageByHour,
      messageHistoryByHour,
      chatlunaModelUsage,
      chatlunaModelTrend,
      chatlunaModelPerformance,
      chatlunaUsageOverview,
    }
  }

  async get() {
    const date = new Date()
    const dateNumber = Time.getDateNumber(date, date.getTimezoneOffset())
    if (dateNumber !== this.cachedDate) {
      this.cachedData = this.download()
      this.cachedDate = dateNumber
    }
    return this.cachedData
  }
}

namespace Analytics {
  export interface Index {
    id?: number
    date: number
    hour: number
    selfId: string
    platform: string
  }

  export interface Audit extends Index {
    count: number
  }

  export interface Message extends Index {
    type: string
    count: number
  }

  export interface Command extends Index {
    name: string
    userId: number
    channelId: string
    count: number
  }

  export interface Payload {
    userCount: number
    userIncrement: number
    guildCount: number
    guildIncrement: number
    dauHistory: number[]
    commandRate: Dict<number>
    messageByBot: Dict<Dict<MessageStats & Universal.User>>
    messageByDate: MessageStats[]
    messageByHour: MessageStats[]
    messageHistoryByHour: MessageStats[]
    chatlunaModelUsage: ModelTokenUsagePayload
    chatlunaModelTrend: ModelUsageTrendPayload
    chatlunaModelPerformance: ModelPerformancePayload
    chatlunaUsageOverview: ChatLunaUsageOverview
  }

  export interface Config {
    statsInternal?: number
  }

  export const Config: Schema<Config> = Schema.object({
    statsInternal: Schema.natural().role('ms').description('统计数据推送的时间间隔。').default(Time.minute * 10),
  })
}

export default Analytics

