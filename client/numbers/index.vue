<template>
  <template v-if="store.analytics">
    <section class="usage-overview">
      <div class="usage-overview-header">
        <div class="overview-copy">
          <h2>欢迎</h2>
          <p>了解你的 API 使用概览和模型表现</p>
        </div>

        <div class="overview-toolbar">
          <div class="toolbar-main">
            <div class="date-chip">
              <k-icon name="analytic:history" />
              <span>{{ dateRangeLabel }}</span>
            </div>
          </div>

          <p class="update-hint">数据更新于 {{ updatedAgoText }}</p>
        </div>
      </div>

      <div class="card-grid chatluna-usage-grid">
        <k-card class="chatluna-usage-card token-card">
          <div class="usage-card-header">
            <span class="usage-card-heading">
              <span class="icon-wrap"><k-icon name="analytic:token" /></span>
              <span class="usage-title">Token 用量</span>
            </span>

            <span class="range-tabs" role="tablist" aria-label="Token 统计周期">
              <button
                v-for="item in tokenRanges"
                :key="item.value"
                :class="{ active: tokenRange === item.value }"
                type="button"
                @click="tokenRange = item.value"
              >{{ item.label }}</button>
            </span>
          </div>

          <div class="metric-row">
            <div class="usage-value token-value">{{ formatToken(tokenStats.totalTokens) }}</div>
            <span :class="['trend-badge', tokenTrend.tone]">
              <strong>{{ trendSymbol(tokenTrend.tone) }} {{ tokenTrend.text }}</strong>
              <small>{{ tokenTrend.label }}</small>
            </span>
          </div>

          <div class="token-breakdown">
            <span>输入 {{ formatToken(tokenStats.inputTokens) }}</span>
            <span>输出 {{ formatToken(tokenStats.outputTokens) }}</span>
            <span>缓存 {{ formatToken(tokenStats.cachedTokens) }}</span>
          </div>
        </k-card>

        <k-card class="chatluna-usage-card activity-card">
          <div class="usage-card-header">
            <span class="usage-card-heading">
              <span class="icon-wrap"><k-icon name="analytic:pulse" /></span>
              <span class="usage-title">今日请求次数</span>
            </span>
          </div>

          <div class="metric-row">
            <div class="usage-value">{{ formatCompact(dayStats.requests) }}</div>
            <span :class="['trend-badge', activityTrend.tone]">
              <strong>{{ trendSymbol(activityTrend.tone) }} {{ activityTrend.text }}</strong>
              <small>{{ activityTrend.label }}</small>
            </span>
          </div>

          <div class="usage-footer">
            <span>{{ activityMeta }}</span>
          </div>
        </k-card>

        <k-card class="chatluna-usage-card success-card">
          <div class="usage-card-header">
            <span class="usage-card-heading">
              <span class="icon-wrap"><k-icon name="analytic:shield" /></span>
              <span class="usage-title">今日成功率</span>
            </span>
          </div>

          <div class="metric-row">
            <div class="usage-value">{{ formatPercent(dayStats.successRate) }}</div>
            <span :class="['trend-badge', successTrend.tone]">
              <strong>{{ trendSymbol(successTrend.tone) }} {{ successTrend.text }}</strong>
              <small>{{ successTrend.label }}</small>
            </span>
          </div>

          <div class="progress-track">
            <span class="progress-bar" :style="{ width: formatPercent(dayStats.successRate) }"></span>
          </div>

          <div class="usage-footer split">
            <span>{{ formatCompact(dayStats.successfulRequests) }} 成功</span>
            <span>{{ formatCompact(dayStats.failedRequests) }} 失败</span>
          </div>
        </k-card>
      </div>
    </section>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { store } from '@koishijs/client'
import type { ChatLunaUsageRangeStats } from '../../src'

type Range = 'day' | 'week' | 'month'
type TrendTone = 'up' | 'down' | 'flat'

interface TrendInfo {
  label: string
  text: string
  tone: TrendTone
}

const rangeMeta: Record<Range, { label: string; compareLabel: string; rangeLabel: string }> = {
  day: { label: '日', compareLabel: '较昨日', rangeLabel: '今日' },
  week: { label: '周', compareLabel: '较前 7 天', rangeLabel: '近 7 日' },
  month: { label: '月', compareLabel: '较前 30 天', rangeLabel: '近 30 日' },
}

const tokenRanges = Object.entries(rangeMeta).map(([value, meta]) => ({
  value: value as Range,
  label: meta.label,
}))

const emptyUsageStats: ChatLunaUsageRangeStats = {
  requests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  successRate: 0,
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
}

const tokenRange = ref<Range>('day')

const usageOverview = computed(() => store.analytics?.chatlunaUsageOverview)

const dayStats = computed(() => usageOverview.value?.day || emptyUsageStats)
const previousDayStats = computed(() => usageOverview.value?.previous?.day || emptyUsageStats)
const tokenStats = computed(() => usageOverview.value?.[tokenRange.value] || emptyUsageStats)
const previousTokenStats = computed(() => usageOverview.value?.previous?.[tokenRange.value] || emptyUsageStats)
const tokenRangeMeta = computed(() => rangeMeta[tokenRange.value])

const successTrend = computed(() => buildTrend(
  dayStats.value.successRate,
  previousDayStats.value.successRate,
  '较昨日',
))

const activityTrend = computed(() => buildTrend(
  dayStats.value.requests,
  previousDayStats.value.requests,
  '较昨日',
))

const tokenTrend = computed(() => buildTrend(
  tokenStats.value.totalTokens,
  previousTokenStats.value.totalTokens,
  tokenRangeMeta.value.compareLabel,
))

const activityMeta = computed(() => {
  return `昨日 ${formatCompact(previousDayStats.value.requests)}`
})

const dateRangeLabel = computed(() => {
  return rangeMeta.day.rangeLabel
})

const updatedAgoText = computed(() => formatUpdatedAgo(usageOverview.value?.updatedAt))

function trimFixed(value: number, fraction = 1) {
  return value.toFixed(fraction).replace(/\.0$/, '')
}

function formatCompact(value: number) {
  if (value >= 1000000000) return `${trimFixed(value / 1000000000)}B`
  if (value >= 1000000) return `${trimFixed(value / 1000000)}M`
  if (value >= 1000) return `${trimFixed(value / 1000)}K`
  return `${Math.round(value)}`
}

function formatToken(value: number) {
  if (value >= 1000000000) return `${trimFixed(value / 1000000000)}B`
  if (value >= 1000000) return `${trimFixed(value / 1000000)}M`
  if (value >= 1000) return `${trimFixed(value / 1000)}K`
  return `${Math.round(value)}`
}

function formatPercent(value: number) {
  return `${trimFixed(Math.max(0, Math.min(value, 1)) * 100)}%`
}

function buildTrend(current: number, previous: number, label: string): TrendInfo {
  if (previous <= 0) {
    if (current <= 0) return { label, text: '0%', tone: 'flat' }
    return { label, text: '新增', tone: 'up' }
  }

  const delta = (current - previous) / previous * 100
  if (Math.abs(delta) < 0.1) {
    return { label, text: '0%', tone: 'flat' }
  }

  return {
    label,
    text: `${delta > 0 ? '+' : ''}${trimFixed(delta, Math.abs(delta) >= 100 ? 0 : 1)}%`,
    tone: delta > 0 ? 'up' : 'down',
  }
}

function trendSymbol(tone: TrendTone) {
  if (tone === 'up') return '↑'
  if (tone === 'down') return '↓'
  return '→'
}

function formatUpdatedAgo(value?: string) {
  if (!value) return '刚刚'

  const diff = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  return `${days} 天前`
}
</script>

<style lang="scss" scoped>
.usage-overview {
  margin: var(--card-margin);
  padding: 1rem 0 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.usage-overview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 0.9rem;
  padding: 0 0.25rem;
}

.overview-copy {
  h2 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.25;
    font-weight: 700;
    color: #0f172a;
  }

  p {
    margin: 0.18rem 0 0;
    font-size: 0.82rem;
    color: #64748b;
  }
}

.overview-toolbar {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  min-width: min(100%, 28rem);
}

.toolbar-main {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.date-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.72rem;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #fff;
  color: #0f172a;
  font-size: 0.84rem;
  box-shadow: none;

  .k-icon {
    width: 0.9rem;
    height: 0.9rem;
    color: #64748b;
  }
}

.range-tabs {
  padding: 0.14rem;
  display: inline-flex;
  gap: 0.08rem;
  border-radius: 999px;
  background: #eef2f7;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);

  button {
    border: 0;
    border-radius: 999px;
    min-width: 2.2rem;
    height: 1.65rem;
    padding: 0 0.58rem;
    background: transparent;
    color: #5f6673;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  }

  button.active {
    color: #fff;
    background: #2f7df7;
    box-shadow: 0 0.35rem 0.8rem rgba(47, 125, 247, 0.24);
  }
}

.update-hint {
  margin: 0;
  font-size: 0.76rem;
  color: #64748b;
}

.chatluna-usage-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media screen and (max-width: 1400px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media screen and (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.chatluna-usage-card {
  --usage-accent: #2563eb;
  --usage-accent-soft: rgba(37, 99, 235, 0.08);
  height: 168px;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fff;
  box-shadow: 0 0.75rem 1.8rem rgba(15, 23, 42, 0.06);

  :deep(.k-card-body) {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 1rem 1.1rem;
  }
}

.success-card {
  --usage-accent: #16a34a;
  --usage-accent-soft: rgba(22, 163, 74, 0.08);
}

.activity-card {
  --usage-accent: #8b5cf6;
  --usage-accent-soft: rgba(139, 92, 246, 0.12);
}

.token-card {
  --usage-accent: #2f7df7;
  --usage-accent-soft: rgba(47, 125, 247, 0.12);
}

.usage-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  min-height: 1.9rem;
}

.usage-card-heading {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.icon-wrap {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--usage-accent);
  background: var(--usage-accent-soft);

  .k-icon {
    width: 1rem;
    height: 1rem;
  }
}

.usage-title {
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.3rem;
}

.usage-value {
  font-size: 2rem;
  line-height: 1.05;
  font-weight: 850;
  color: #111827;
  letter-spacing: 0;
}

.token-value {
  font-size: 2.15rem;
}

.usage-footer {
  font-size: 0.86rem;
  color: #697386;
  font-weight: 700;
  margin-top: auto;
}

.split {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}

.progress-track {
  height: 0.45rem;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(22, 163, 74, 0.14);
  margin-top: 0.05rem;
}

.progress-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.94), rgba(22, 163, 74, 0.94));
}

.trend-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.45rem;
  text-align: right;
  white-space: nowrap;

  strong {
    font-size: 0.86rem;
    line-height: 1;
    font-weight: 800;
  }

  small {
    font-size: 0.76rem;
    color: #697386;
    font-weight: 700;
  }
}

.trend-badge.up {
  color: #16a34a;
}

.trend-badge.down {
  color: #dc2626;
}

.trend-badge.flat {
  color: #64748b;
}

.token-breakdown {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  min-width: 0;
  font-size: 0.84rem;
  color: #697386;
  font-weight: 800;

  span {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span + span::before {
    content: "·";
    margin-right: 0.38rem;
    color: #a7adba;
  }
}

@media screen and (max-width: 900px) {
  .usage-overview-header {
    flex-direction: column;
  }

  .overview-toolbar {
    width: 100%;
    align-items: stretch;
    min-width: 0;
  }

  .toolbar-main {
    justify-content: space-between;
  }

  .split {
    align-items: flex-start;
  }
}

@media screen and (max-width: 640px) {
  .overview-copy h2 {
    font-size: 1.05rem;
  }

  .toolbar-main {
    flex-direction: column;
    align-items: stretch;
  }

  .date-chip {
    width: 100%;
    justify-content: center;
  }

  .usage-value {
    font-size: 1.75rem;
  }

  .usage-footer {
    flex-direction: column;
  }

  .trend-badge {
    align-items: flex-start;
    text-align: left;
  }

  .token-breakdown {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .token-breakdown span + span::before {
    content: none;
  }
}
</style>
