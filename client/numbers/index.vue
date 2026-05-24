<template>
  <template v-if="store.analytics">
    <div class="card-grid chatluna-usage-grid">
      <k-card class="chatluna-usage-card">
        <div class="usage-card-header">
          <span class="icon-wrap"><k-icon name="analytic:request"/></span>
          <span class="usage-title">总请求数</span>
        </div>
        <div class="usage-value">{{ formatCompact(usageOverview?.totalRequests || 0) }}</div>
        <div class="usage-footer split">
          <span>成功 {{ formatCompact(usageOverview?.successfulRequests || 0) }}</span>
          <span>失败 {{ formatCompact(usageOverview?.failedRequests || 0) }}</span>
        </div>
      </k-card>

      <k-card class="chatluna-usage-card success-card">
        <div class="usage-card-header">
          <span class="icon-wrap"><k-icon name="analytic:shield"/></span>
          <span class="usage-title">成功率</span>
        </div>
        <div class="usage-value">{{ formatPercent(usageOverview?.successRate || 0) }}</div>
        <div class="progress-track">
          <span class="progress-bar" :style="{ width: formatPercent(usageOverview?.successRate || 0) }"></span>
        </div>
        <div class="usage-footer split">
          <span>{{ formatCompact(usageOverview?.failedRequests || 0) }} 失败请求</span>
          <span>平均值</span>
        </div>
      </k-card>

      <k-card class="chatluna-usage-card token-card">
        <div class="usage-card-header">
          <span class="icon-wrap"><k-icon name="analytic:token"/></span>
          <span class="usage-title">Token 用量统计</span>
          <span class="range-tabs">
            <button
              v-for="item in tokenRanges"
              :key="item.value"
              :class="{ active: tokenRange === item.value }"
              type="button"
              @click="tokenRange = item.value"
            >{{ item.label }}</button>
          </span>
        </div>
        <div class="token-stat-row">
          <span>
            <small>输入</small>
            <strong>{{ formatToken(tokenStats.inputTokens) }}</strong>
          </span>
          <span>
            <small>输出</small>
            <strong>{{ formatToken(tokenStats.outputTokens) }}</strong>
          </span>
          <span>
            <small>缓存</small>
            <strong>{{ formatToken(tokenStats.cachedTokens) }}</strong>
          </span>
        </div>
        <div class="usage-footer split">
          <span>总量</span>
          <span>{{ formatToken(tokenStats.totalTokens) }}</span>
        </div>
      </k-card>

      <k-card class="chatluna-usage-card today-card">
        <div class="usage-card-header">
          <span class="icon-wrap"><k-icon name="analytic:pulse"/></span>
          <span class="usage-title">今日请求次数</span>
        </div>
        <div class="usage-value">{{ formatCompact(usageOverview?.todayRequests || 0) }}</div>
        <div class="usage-footer split">
          <span>本周: {{ formatCompact(usageOverview?.weekRequests || 0) }}</span>
          <span>本月: {{ formatCompact(usageOverview?.monthRequests || 0) }}</span>
        </div>
      </k-card>
    </div>
  </template>
</template>

<script setup lang="ts">

import { computed, ref } from 'vue'
import { store } from '@koishijs/client'
import type { ChatLunaUsageRangeStats } from '../../src'

type Range = 'day' | 'week' | 'month'

const tokenRanges: { label: string; value: Range }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
]

const emptyUsageStats: ChatLunaUsageRangeStats = {
  requests: 0,
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  totalTokens: 0,
}

const tokenRange = ref<Range>('day')

const usageOverview = computed(() => store.analytics.chatlunaUsageOverview)

const tokenStats = computed(() => {
  return usageOverview.value?.[tokenRange.value] || emptyUsageStats
})

function trimFixed(value: number, fraction = 1) {
  return value.toFixed(fraction).replace(/\.0$/, '')
}

function formatCompact(value: number) {
  if (value >= 1000000000) return `${trimFixed(value / 1000000000)}B`
  if (value >= 1000000) return `${trimFixed(value / 1000000)}M`
  if (value >= 1000) return `${trimFixed(value / 1000)}K`
  return `${value}`
}

function formatToken(value: number) {
  if (value >= 1000000) return `${trimFixed(value / 1000000)}M`
  if (value >= 1000) return `${trimFixed(value / 1000)}K`
  return `${value}`
}

function formatPercent(value: number) {
  return `${trimFixed(Math.max(0, Math.min(value, 1)) * 100)}%`
}

</script>

<style lang="scss" scoped>

.chatluna-usage-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media screen and (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media screen and (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.chatluna-usage-card {
  --usage-accent: #3b82f6;
  --usage-accent-soft: rgba(59, 130, 246, 0.12);
  min-height: 168px;

  :deep(.k-card-body) {
    min-height: 132px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
}

.usage-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.25rem;
}

.icon-wrap {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--usage-accent);
  background: var(--usage-accent-soft);

  .k-icon {
    width: 1.25rem;
    height: 1.25rem;
  }
}

.usage-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--k-text-normal);
}

.usage-value {
  margin-top: auto;
  font-size: 2.25rem;
  line-height: 1;
  font-weight: 600;
  color: var(--k-text-normal);
}

.usage-footer {
  font-size: 0.9rem;
  color: var(--k-text-light);
}

.split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.progress-track {
  height: 0.55rem;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(59, 130, 246, 0.16);
}

.progress-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--usage-accent);
}

.range-tabs {
  margin-left: auto;
  padding: 0.15rem;
  display: inline-flex;
  border-radius: 999px;
  background: var(--usage-accent-soft);

  button {
    border: 0;
    border-radius: 999px;
    padding: 0.2rem 0.55rem;
    color: var(--k-text-normal);
    background: transparent;
    cursor: pointer;
    font: inherit;
    line-height: 1.25;
  }

  button.active {
    color: #fff;
    background: var(--usage-accent);
  }
}

.token-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  text-align: center;

  span + span {
    border-left: 1px solid var(--k-card-border);
  }

  small {
    display: block;
    margin-bottom: 0.45rem;
    color: var(--k-text-light);
  }

  strong {
    display: block;
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--k-text-normal);
    white-space: nowrap;
  }
}

.today-card {
  --usage-accent: #0ea5e9;
  --usage-accent-soft: rgba(14, 165, 233, 0.12);

  .usage-footer {
    padding-top: 0.85rem;
    border-top: 1px solid var(--k-card-border);
  }
}

</style>
