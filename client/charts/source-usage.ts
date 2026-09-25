import { Context, store } from '@koishijs/client'
import { computed, defineComponent, h, ref, resolveComponent } from 'vue'
import type { SourceTokenUsage } from '../../src'
import { modelColors } from './model-colors'
import { formatTokens, trimFixed, useRowCapacity } from './utils'

type Range = 'day' | 'week' | 'month'

const rangeLabel: Record<Range, string> = {
  day: '日',
  week: '周',
  month: '月',
}

export const SourceUsagePanel = defineComponent({
  name: 'SourceUsagePanel',

  setup() {
    const range = ref<Range>('day')
    const listEl = ref<HTMLElement>()
    const capacity = useRowCapacity(listEl)

    const items = computed(() => (store.analytics?.chatlunaSourceUsage?.[range.value] || []) as SourceTokenUsage[])

    return () => {
      if (!store.analytics) return null

      const list = items.value
      const total = list.reduce((sum, item) => sum + item.totalTokens, 0)
      const overflow = list.length > capacity.value
      const visibleCount = overflow ? Math.max(1, capacity.value - 1) : list.length
      const visible = list.slice(0, visibleCount)
      const hidden = list.slice(visibleCount)

      const tabs = (Object.keys(rangeLabel) as Range[]).map(key =>
        h('button', {
          class: { active: range.value === key },
          type: 'button',
          onClick: () => range.value = key,
        }, [rangeLabel[key]]),
      )

      const rows = visible.map((item, i) => {
        const color = modelColors[i % modelColors.length]
        const percent = total ? item.totalTokens / total : 0
        return h('div', { class: 'perf-row', key: item.source }, [
          h('div', { class: 'perf-row-header' }, [
            h('span', {
              class: 'perf-dot',
              style: { background: color, boxShadow: `0 0 0 3px ${color}22` },
            }),
            h('span', { class: 'perf-model-name', title: item.source, style: { color } }, [item.source]),
          ]),
          h('div', { class: 'perf-row-metrics' }, [
            h('span', { class: 'perf-tps' }, [formatTokens(item.totalTokens)]),
            h('span', { class: 'perf-sep' }, ['·']),
            h('span', { class: 'perf-ttft' }, [`${trimFixed(percent * 100)}%`]),
          ]),
        ])
      })

      if (overflow && hidden.length) {
        rows.push(h('div', {
          class: 'perf-row perf-more',
          title: hidden.map(item => item.source).join('、'),
        }, [h('span', [`… 还有 ${hidden.length} 个插件`])]))
      }

      const body = list.length
        ? h('div', { class: 'perf-list', ref: listEl }, rows)
        : h('div', { class: 'perf-list', ref: listEl }, [h('div', { class: 'perf-empty' }, ['暂无数据'])])

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart source-usage-card' }, {
        header: () => [
          h('span', { class: 'left' }, ['插件用量']),
          h('span', { class: 'model-range-tabs', role: 'tablist' }, tabs),
        ],
        default: () => body,
      })
    }
  },
})

export default (_ctx: Context) => {
  // SourceUsagePanel is placed directly in home.vue layout
}
