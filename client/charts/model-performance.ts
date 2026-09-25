import { Context, store } from '@koishijs/client'
import { computed, defineComponent, h, ref, resolveComponent } from 'vue'
import type { ModelPerformanceStats } from '../../src'
import { canonicalModelOrder, modelColor } from './model-colors'
import { useRowCapacity } from './utils'

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

export const ModelPerformancePanel = defineComponent({
  name: 'ModelPerformancePanel',

  setup() {
    const range = ref<Range>('day')
    const listEl = ref<HTMLElement>()
    const capacity = useRowCapacity(listEl)

    const perf = computed(() => (store.analytics?.chatlunaModelPerformance?.[range.value] || []) as ModelPerformanceStats[])

    return () => {
      if (!store.analytics) return null

      const items = perf.value
      const overflow = items.length > capacity.value
      const visibleCount = overflow ? Math.max(1, capacity.value - 1) : items.length
      const visible = items.slice(0, visibleCount)
      const hidden = items.slice(visibleCount)
      const colorOrder = canonicalModelOrder(range.value, items.map(item => item.model))

      const tabs = (Object.keys(rangeLabel) as Range[]).map(key =>
        h('button', {
          class: { active: range.value === key },
          type: 'button',
          onClick: () => range.value = key,
        }, [rangeLabel[key]]),
      )

      const rows = visible.map((item) => {
        const color = modelColor(item.model, colorOrder)
        const dotColor = tpsColor(item.avgTps)
        return h('div', { class: 'perf-row', key: item.model }, [
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

      if (overflow && hidden.length) {
        rows.push(h('div', {
          class: 'perf-row perf-more',
          title: hidden.map(item => item.model).join('、'),
        }, [h('span', [`… 还有 ${hidden.length} 个模型`])]))
      }

      const body = items.length
        ? h('div', { class: 'perf-list', ref: listEl }, rows)
        : h('div', { class: 'perf-list', ref: listEl }, [h('div', { class: 'perf-empty' }, ['暂无数据'])])

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart model-perf-card' }, {
        header: () => [
          h('span', { class: 'left' }, ['模型性能']),
          h('span', { class: 'model-range-tabs', role: 'tablist' }, tabs),
        ],
        default: () => body,
      })
    }
  },
})

export default (ctx: Context) => {
  // ModelPerformancePanel is placed directly in home.vue layout
}
