<template>
  <template v-if="store.analytics">
    <section class="usage-overview">
      <div class="card-grid chatluna-usage-grid">
        <k-card class="chatluna-usage-card analytics-requests-card">
          <div class="usage-card-header">
            <span class="usage-card-heading">
              <span class="icon-wrap"><k-icon name="analytic:request" /></span>
              <span class="usage-title">总请求</span>
              <span class="info-tooltip-wrap">
                <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span class="tooltip-content">自插件启用以来向 API 发起请求的总次数</span>
              </span>
            </span>
          </div>

          <div class="metric-row">
            <div class="usage-value">{{ formatCompact(usageOverview?.totalRequests || 0) }}</div>
            <span class="trend-detail">
              <span class="trend-detail-item up">{{ formatCompact(usageOverview?.successfulRequests || 0) }} 成功</span>
              <span class="trend-detail-item down">{{ formatCompact(usageOverview?.failedRequests || 0) }} 失败</span>
            </span>
          </div>

          <div class="usage-footer">累计成功率 {{ formatPercent(usageOverview?.successRate || 0) }}</div>
        </k-card>

        <k-card class="chatluna-usage-card analytics-success-card">
          <div class="usage-card-header">
            <span class="usage-card-heading">
              <span class="icon-wrap"><k-icon name="analytic:shield" /></span>
              <span class="usage-title">今日成功率</span>
              <span class="info-tooltip-wrap">
                <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span class="tooltip-content">今日所有 API 请求的成功率（成功次数 / 总请求次数）</span>
              </span>
            </span>
          </div>

          <div class="metric-row">
            <div class="usage-value">{{ formatPercent(dayStats.successRate) }}</div>
            <span :class="['trend-badge', successTrend.tone]">
              <strong>{{ trendSymbol(successTrend.tone) }} {{ successTrend.text }}</strong>
            </span>
          </div>

          <div class="usage-footer">{{ successMeta }}</div>
        </k-card>

        <k-card class="chatluna-usage-card analytics-token-card">
          <div class="usage-card-header">
            <span class="usage-card-heading">
              <span class="icon-wrap"><k-icon name="analytic:token" /></span>
              <span class="usage-title">Token 用量</span>
              <span class="info-tooltip-wrap">
                <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span class="tooltip-content">在所选周期内消耗的 Token 总量，包含输入、输出及缓存</span>
              </span>
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
            </span>
          </div>

          <div class="token-breakdown">
            <span>输入 {{ formatToken(tokenStats.inputTokens) }}</span>
            <span>输出 {{ formatToken(tokenStats.outputTokens) }}</span>
            <span>缓存 {{ formatToken(tokenStats.cachedTokens) }}</span>
          </div>
        </k-card>

        <k-card class="chatluna-usage-card analytics-activity-card">
          <div class="usage-card-header">
            <span class="usage-card-heading">
              <span class="icon-wrap"><k-icon name="analytic:pulse" /></span>
              <span class="usage-title">今日请求次数</span>
              <span class="info-tooltip-wrap">
                <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span class="tooltip-content">今日向 API 发起请求的总次数，包含成功和失败的请求</span>
              </span>
            </span>
          </div>

          <div class="metric-row">
            <div class="usage-value">{{ formatCompact(dayStats.requests) }}</div>
            <span :class="['trend-badge', activityTrend.tone]">
              <strong>{{ trendSymbol(activityTrend.tone) }} {{ activityTrend.text }}</strong>
            </span>
          </div>

          <div class="usage-footer">{{ activityMeta }}</div>
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

const rangeMeta: Record<Range, { label: string; compareLabel: string }> = {
  day: { label: '日', compareLabel: '较昨日' },
  week: { label: '周', compareLabel: '较前 7 天' },
  month: { label: '月', compareLabel: '较前 30 天' },
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
  responseTimeSamples: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
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

const successMeta = computed(() => {
  return `昨日成功率 ${formatPercent(previousDayStats.value.successRate)}`
})

const activityMeta = computed(() => {
  return `昨日请求数 ${formatCompact(previousDayStats.value.requests)}`
})

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
    return { label, text: '+100%', tone: 'up' }
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

</script>

<style lang="scss" scoped>
.usage-overview {
  position: relative;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  z-index: 5;
}

.range-tabs {
  padding: 0.1rem;
  display: inline-flex;
  gap: 0.06rem;
  border-radius: 999px;
  background: #eef2f7;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);

  button {
    border: 0;
    border-radius: 999px;
    min-width: 2rem;
    height: 1.45rem;
    padding: 0 0.5rem;
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

.chatluna-usage-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;

  @media screen and (max-width: 1600px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media screen and (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.chatluna-usage-card {
  --usage-accent: #2563eb;
  --usage-accent-soft: rgba(37, 99, 235, 0.08);
  height: 200px;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fff;
  box-shadow: 0 0.75rem 1.8rem rgba(15, 23, 42, 0.06);
  overflow: visible;
  display: flex;
  flex-direction: column;

  :deep(.k-card-body) {
    position: relative;
    box-sizing: border-box;
    flex: 1;
    height: auto;
    margin: 0;
    padding: 1.1rem 1rem 0.9rem;
  }
}

.analytics-requests-card {
  --usage-accent: #6366f1;
  --usage-accent-soft: rgba(99, 102, 241, 0.08);
  height: 200px !important;
}

.analytics-success-card {
  --usage-accent: #16a34a;
  --usage-accent-soft: rgba(22, 163, 74, 0.08);
  height: 200px !important;
}

.analytics-activity-card {
  --usage-accent: #8b5cf6;
  --usage-accent-soft: rgba(139, 92, 246, 0.12);
  height: 200px !important;
}

.analytics-token-card {
  --usage-accent: #2f7df7;
  --usage-accent-soft: rgba(47, 125, 247, 0.12);
  height: 200px !important;
}

.usage-card-header {
  position: absolute;
  top: 1.1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  min-height: 0;
}

.usage-card-heading {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.icon-wrap {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--usage-accent);
  background: var(--usage-accent-soft);

  .k-icon {
    width: 0.88rem;
    height: 0.88rem;
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
  position: absolute;
  left: 1rem;
  right: 1rem;
  top: 50%;
  transform: translateY(-38%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 0;
}

.usage-value {
  font-size: 1.9rem;
  line-height: 1.05;
  font-weight: 850;
  color: #111827;
  letter-spacing: 0;
}

.token-value {
  font-size: 1.9rem;
}

.usage-footer {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 0.85rem;
  font-size: 0.78rem;
  color: #697386;
  font-weight: 700;
}

.split {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}

.info-tooltip-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  color: #94a3b8;
  cursor: pointer;
  vertical-align: middle;

  &:hover {
    color: #64748b;
    
    .tooltip-content {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
  }
}

.info-icon {
  width: 0.82rem;
  height: 0.82rem;
  stroke-width: 2.2;
}

.tooltip-content {
  position: absolute;
  top: 135%;
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: #1e293b;
  color: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.4;
  width: max-content;
  max-width: min(28rem, calc(100vw - 2rem));
  white-space: normal;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.18s ease, visibility 0.18s ease, transform 0.18s ease;
  z-index: 9999;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent #1e293b transparent;
  }
}

.trend-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.18rem;
  text-align: right;
  white-space: nowrap;

  strong {
    font-size: 0.78rem;
    line-height: 1;
    font-weight: 800;
  }

  small {
    display: none;
    font-size: 0.68rem;
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

.trend-detail {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  text-align: right;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 700;

  .trend-detail-item {
    line-height: 1;
  }

  .trend-detail-item.up {
    color: #16a34a;
  }

  .trend-detail-item.down {
    color: #dc2626;
  }
}

.token-breakdown {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.38rem;
  min-width: 0;
  font-size: 0.76rem;
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
  .split {
    align-items: flex-start;
  }
}

@media screen and (max-width: 640px) {
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
