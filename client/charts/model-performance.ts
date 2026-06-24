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
  if (ms >= 10000) return `${(ms / 1000).toFixed(1)}s`
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}

function formatTps(tps: number) {
  if (tps >= 100) return `${Math.round(tps)}`
  return `${tps.toFixed(1)}`
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

      const maxTtft = Math.max(...perf.map(item => item.avgTtftMs), 1)
      const maxTps = Math.max(...perf.map(item => item.avgTps), 1)

      const createBar = (value: number, max: number, color: string, label: string) => {
        const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
        return h('div', { class: 'perf-bar-row' }, [
          h('div', { class: 'perf-model-label', title: label }, [label]),
          h('div', { class: 'perf-bar-track' }, [
            h('div', {
              class: 'perf-bar-fill',
              style: {
                width: `${pct}%`,
                background: color,
              },
            }),
          ]),
          h('span', { class: 'perf-bar-value' }, [value > 0 ? (label === 'TTFT' ? formatMs(value) : formatTps(value)) : '—']),
        ])
      }

      const ttftBars = perf.map((item, i) =>
        createBar(item.avgTtftMs, maxTtft, modelColors[i % modelColors.length], item.model),
      )
      const tpsBars = perf.map((item, i) =>
        createBar(item.avgTps, maxTps, modelColors[i % modelColors.length], item.model),
      )

      const tabs = (Object.keys(rangeLabel) as Range[]).map(key =>
        h('button', {
          class: { active: range.value === key },
          type: 'button',
          onClick: () => range.value = key,
        }, [rangeLabel[key]]),
      )

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart model-perf-card' }, {
        header: () => [
          h('span', { class: 'left' }, ['模型性能']),
          h('span', { class: 'range-tabs', role: 'tablist' }, tabs),
        ],
        default: () => h('div', { class: 'perf-panel' }, [
          h('div', { class: 'perf-section' }, [
            h('div', { class: 'perf-heading' }, ['首字延迟 TTFT']),
            ...ttftBars,
          ]),
          h('div', { class: 'perf-section' }, [
            h('div', { class: 'perf-heading' }, ['输出速度 TPS']),
            ...tpsBars,
          ]),
        ]),
      })
    }
  },
})

export default (ctx: Context) => {
  // ModelPerformancePanel is placed directly in home.vue layout
}
