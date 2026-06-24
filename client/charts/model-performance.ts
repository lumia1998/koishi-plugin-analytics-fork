import { Context, store } from '@koishijs/client'
import { defineComponent, h, ref, resolveComponent } from 'vue'
import type { ModelPerformanceStats } from '../../src'

type Range = 'day' | 'week' | 'month'

const rangeLabel: Record<Range, string> = {
  day: '日',
  week: '周',
  month: '月',
}

function formatMs(ms: number) {
  if (ms <= 0) return '—'
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}min`
  if (ms >= 10000) return `${(ms / 1000).toFixed(1)}s`
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

function formatTps(tps: number) {
  if (tps <= 0) return '—'
  if (tps >= 100) return `${Math.round(tps)} tok/s`
  return `${tps.toFixed(1)} tok/s`
}

// TPS speed indicator color
function tpsColor(tps: number): string {
  if (tps <= 0) return '#94a3b8'
  if (tps >= 100) return '#16a34a'
  if (tps >= 30) return '#f59e0b'
  return '#ef4444'
}

const modelColors = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#64748b',
  '#84cc16',
]

export const ModelPerformancePanel = defineComponent({
  name: 'ModelPerformancePanel',

  setup() {
    const range = ref<Range>('day')

    return () => {
      const perf = (store.analytics?.chatlunaModelPerformance?.[range.value] || []) as ModelPerformanceStats[]
      if (!perf.length) return null

      const tabs = (Object.keys(rangeLabel) as Range[]).map(key =>
        h('button', {
          class: { active: range.value === key },
          type: 'button',
          onClick: () => range.value = key,
        }, [rangeLabel[key]]),
      )

      const rows = perf.map((item, i) => {
        const color = modelColors[i % modelColors.length]
        const dotColor = tpsColor(item.avgTps)
        return h('div', { class: 'perf-row' }, [
          h('div', { class: 'perf-row-header' }, [
            h('span', {
              class: 'perf-dot',
              style: { background: dotColor, boxShadow: `0 0 0 3px ${dotColor}22` },
            }),
            h('span', { class: 'perf-model-name', title: item.model, style: { color } }, [item.model]),
          ]),
          h('div', { class: 'perf-row-metrics' }, [
            h('span', { class: 'perf-tps' }, [formatTps(item.avgTps)]),
            h('span', { class: 'perf-sep' }, ['·']),
            h('span', { class: 'perf-ttft' }, ['TTFT ', formatMs(item.avgTtftMs)]),
          ]),
        ])
      })

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart model-perf-card' }, {
        header: () => [
          h('span', { class: 'left' }, ['模型性能']),
          h('span', { class: 'model-range-tabs', role: 'tablist' }, tabs),
        ],
        default: () => h('div', { class: 'perf-list' }, rows),
      })
    }
  },
})

export default (ctx: Context) => {
  // ModelPerformancePanel is placed directly in home.vue layout
}
