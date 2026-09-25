import { Context, store } from '@koishijs/client'
import { defineAsyncComponent, defineComponent, h, ref, resolveComponent } from 'vue'
import type * as echarts from 'echarts'
import { emptyChart, formatTokens, Tooltip } from './utils'
import { canonicalModelOrder, modelColor } from './model-colors'

const VChart = defineAsyncComponent(() => import('./echarts'))

type TrendRange = 'week' | 'month' | 'all'

interface ModelTrendPoint {
  date: number
  label: string
  requests: number
  totalTokens: number
}

interface ModelTrendSeries {
  model: string
  requests: number
  totalTokens: number
  points: ModelTrendPoint[]
}

const trendRangeLabel: Record<TrendRange, string> = {
  week: '周',
  month: '月',
  all: '全部',
}

// 'all' 没有对应的用量周期，按月排名近似
const colorRangeMap: Record<TrendRange, 'day' | 'week' | 'month'> = {
  week: 'week',
  month: 'month',
  all: 'month',
}

interface TokenScale {
  max: number
  interval: number
}

function getAxisScale(maxTokens: number): TokenScale {
  if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
    return { max: 4, interval: 1 }
  }

  const paddedMax = maxTokens * 1.03
  const magnitude = 10 ** Math.floor(Math.log10(paddedMax))
  const normalized = paddedMax / magnitude
  const axisMax = Math.ceil(normalized * 10) / 10 * magnitude

  return { max: axisMax, interval: axisMax / 4 }
}

function createTrendData(range: TrendRange): ModelTrendSeries[] {
  const usage = (store.analytics?.chatlunaModelTrend as any)?.[range] as ModelTrendSeries[] | undefined
  return (usage || []).filter(item => item.points?.length)
}

function createTabs<T extends string>(labels: Record<T, string>, active: T, onSelect: (value: T) => void) {
  return h('span', { class: 'model-range-tabs', role: 'tablist' }, (Object.keys(labels) as T[]).map(key => h('button', {
    class: { active: active === key },
    type: 'button',
    onClick: () => onSelect(key),
  }, [labels[key]])))
}

export const ModelTrendChart = defineComponent({
  name: 'ModelTrendChart',

  setup() {
    const range = ref<TrendRange>('week')

    return () => {
      if (!store.analytics) return null

      const data = createTrendData(range.value)
      const axisLabels = data[0]?.points.map(item => item.label) || []
      const maxTotal = Math.max(0, ...axisLabels.map((_, i) =>
        data.reduce((sum, s) => sum + (s.points[i]?.totalTokens ?? 0), 0),
      ))
      const scale = getAxisScale(maxTotal)
      const colorOrder = canonicalModelOrder(colorRangeMap[range.value], data.map(item => item.model))
      const seriesColor = (model: string) => modelColor(model, colorOrder)

      const option: echarts.EChartsOption = data.length ? {
        color: data.map((item) => seriesColor(item.model)),
        grid: { top: 24, left: 60, right: 18, bottom: 56 },
        legend: {
          type: 'scroll',
          bottom: 4,
          left: 'center',
          icon: 'circle',
          itemWidth: 9,
          itemHeight: 9,
          itemGap: 16,
          padding: [4, 8],
          textStyle: { color: '#6b7280', fontSize: 12 },
          data: data.map((item) => ({
            name: item.model,
            itemStyle: { color: seriesColor(item.model) },
          })),
        },
        tooltip: {
          ...Tooltip.axis<number>((params) => {
            const index = params[0]?.dataIndex ?? 0
            const title = axisLabels[index] || ''
            const visible = params
              .map((item) => {
                const series = data[item.seriesIndex ?? 0]
                const point = series?.points[index]
                const tokens = point?.totalTokens ?? 0
                if (!tokens) return null
                const name = (series?.model ?? item.seriesName ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                const value = formatTokens(tokens)
                const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px;vertical-align:middle"></span>`
                return { html: `<tr style="border:none;"><td style="text-align:left;padding:1px 18px 1px 0;white-space:nowrap;border:none;">${dot}${name}</td><td style="text-align:right;white-space:nowrap;font-weight:700;border:none;">${value}</td></tr>`, tokens }
              })
              .filter((v): v is NonNullable<typeof v> => v !== null)
            const total = visible.reduce((sum, v) => sum + v.tokens, 0)
            const rows = visible.map(v => v.html).join('')
            return `<div style="margin-bottom:4px;font-weight:700;color:#374151">日期：${title}</div><table style="border-collapse:collapse;border:none;margin:0;padding:0;">${rows}<tr style="border-top:1px solid rgba(148,163,184,0.3);border-bottom:none;border-left:none;border-right:none;"><td style="text-align:left;padding:4px 18px 1px 0;white-space:nowrap;font-weight:800;border:none;">合计</td><td style="text-align:right;padding-top:4px;white-space:nowrap;font-weight:800;border:none;">${formatTokens(total)}</td></tr></table>`
          }),
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderColor: 'rgba(148,163,184,0.25)',
          borderWidth: 1,
          padding: [10, 14],
          extraCssText: 'border-radius:8px;box-shadow:0 4px 16px rgba(15,23,42,0.1);',
        },
        xAxis: {
          type: 'category',
          data: axisLabels,
          axisTick: { alignWithLabel: true },
          axisLabel: {
            color: '#6b7280',
            interval: axisLabels.length > 14 ? Math.floor(axisLabels.length / 10) : 0,
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: scale.max,
          interval: scale.interval,
          axisLabel: { color: '#5f6673', formatter: (value: number) => formatTokens(value) },
          splitLine: { lineStyle: { type: 'dashed', color: 'rgba(120, 113, 108, 0.25)' } },
        },
        series: data.map((item, index) => ({
          name: item.model,
          type: 'bar',
          stack: 'tokens',
          barMaxWidth: 48,
          emphasis: { focus: 'series' },
          itemStyle: {
            color: seriesColor(item.model),
            borderRadius: index === data.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0],
          },
          data: item.points.map(point => point.totalTokens),
        })),
      } : emptyChart()

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart model-trend-card' }, {
        header: () => [
          h('span', { class: 'left' }, ['模型用量']),
          createTabs(trendRangeLabel, range.value, value => range.value = value),
        ],
        default: () => h('div', { class: 'model-trend-body' }, [h(VChart, { option, autoresize: true })]),
      })
    }
  },
})

export default (_ctx: Context) => {}
