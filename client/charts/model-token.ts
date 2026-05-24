import { Context, store } from '@koishijs/client'
import { defineAsyncComponent, defineComponent, h, ref, resolveComponent } from 'vue'
import type * as echarts from 'echarts'
import { emptyChart, Tooltip } from './utils'

const VChart = defineAsyncComponent(() => import('./echarts'))

type Range = 'day' | 'week' | 'month'

interface ModelTokenPoint {
  model: string
  totalTokens: number
}

interface ModelTokenData {
  name: string
  totalTokens: number
  color: string
}

interface TokenScale {
  unit: '' | 'K' | 'M'
  divisor: number
  fraction: number
  interval?: number
}

const rangeLabel: Record<Range, string> = {
  day: '最近一天',
  week: '最近一周',
  month: '最近一个月',
}

const millionInterval: Record<Range, number> = {
  day: 0.5,
  week: 5,
  month: 10,
}

const modelColors = [
  '#2563eb',
  '#38bdf8',
  '#0ea5e9',
  '#64748b',
  '#1d4ed8',
  '#60a5fa',
  '#0284c7',
  '#475569',
  '#3b82f6',
  '#7dd3fc',
]

function trimFixed(value: number, fraction = 1) {
  return value.toFixed(fraction).replace(/\.0$/, '')
}

function getNiceInterval(value: number) {
  if (!Number.isFinite(value) || value <= 0) return undefined
  const rough = value / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function getTokenScale(maxTokens: number, range: Range): TokenScale {
  if (maxTokens >= 1000000) {
    const maxValue = maxTokens / 1000000
    const interval = maxValue >= millionInterval[range]
      ? millionInterval[range]
      : getNiceInterval(maxValue)
    return { unit: 'M', divisor: 1000000, fraction: maxValue < 10 ? 1 : 0, interval }
  }
  if (maxTokens >= 1000) {
    const maxValue = maxTokens / 1000
    return { unit: 'K', divisor: 1000, fraction: maxValue < 10 ? 1 : 0, interval: getNiceInterval(maxValue) }
  }
  return { unit: '', divisor: 1, fraction: 0, interval: getNiceInterval(maxTokens) }
}

function formatScaledValue(value: number, scale: TokenScale) {
  return `${trimFixed(value, scale.fraction)}${scale.unit}`
}

function formatTokens(tokens: number) {
  if (tokens >= 1000000) return `${trimFixed(tokens / 1000000, tokens < 10000000 ? 1 : 0)}M`
  if (tokens >= 1000) return `${trimFixed(tokens / 1000, tokens < 10000 ? 1 : 0)}K`
  return `${Math.round(tokens)}`
}

function formatPercent(value: number) {
  return `${trimFixed(value * 100, value < 0.1 ? 1 : 0)}%`
}

function createTokenData(range: Range): ModelTokenData[] {
  const usage = store.analytics?.chatlunaModelUsage?.[range] as ModelTokenPoint[] | undefined
  return (usage || [])
    .map((item, index) => ({
      name: item.model || '未知模型',
      totalTokens: Math.max(0, item.totalTokens || 0),
      color: modelColors[index % modelColors.length],
    }))
    .filter(item => item.totalTokens > 0)
}

const ModelTokenChart = defineComponent({
  name: 'ModelTokenChart',

  setup() {
    const range = ref<Range>('day')

    return () => {
      if (!store.analytics) return null

      const data = createTokenData(range.value)
      const totalTokens = data.reduce((sum, item) => sum + item.totalTokens, 0)
      const maxTokens = Math.max(0, ...data.map(item => item.totalTokens))
      const scale = getTokenScale(maxTokens, range.value)

      const option: echarts.EChartsOption = data.length ? {
        color: data.map(item => item.color),
        grid: {
          top: 28,
          left: 64,
          right: 28,
          bottom: 28,
        },
        tooltip: Tooltip.axis<{ value: number; totalTokens: number; dataIndex: number }>((params) => {
          const point = data[params[0]?.dataIndex ?? 0]
          return [
            point?.name ?? '',
            `Token 总量：${formatTokens(point?.totalTokens ?? 0)}`,
          ].join('<br>')
        }),
        xAxis: {
          type: 'category',
          data: data.map(item => item.name),
          axisTick: {
            show: false,
          },
          axisLabel: {
            show: false,
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          interval: scale.interval,
          axisLabel: {
            formatter: (value: number) => formatScaledValue(value, scale),
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: 'rgba(148, 163, 184, 0.28)',
            },
          },
        },
        series: [{
          name: 'Token 总量',
          type: 'bar',
          barMaxWidth: 42,
          data: data.map(item => ({
            value: +(item.totalTokens / scale.divisor).toFixed(3),
            totalTokens: item.totalTokens,
            itemStyle: {
              color: item.color,
              borderRadius: [5, 5, 0, 0],
            },
          })),
          label: {
            show: true,
            position: 'top',
            color: '#64748b',
            formatter: ({ data }: any) => formatTokens(data.totalTokens),
          },
        }],
      } : emptyChart()

      const legend = data.map((item, index) => h('div', {
        class: 'model-token-legend-item',
        style: `--model-color: ${item.color}`,
      }, [
        h('span', { class: 'legend-rank' }, [`#${index + 1}`]),
        h('span', { class: 'legend-dot' }),
        h('span', { class: 'legend-main' }, [
          h('span', { class: 'legend-name', title: item.name }, [item.name]),
          h('span', { class: 'legend-share' }, [`${formatPercent(item.totalTokens / totalTokens)} 占比`]),
        ]),
        h('span', { class: 'legend-value' }, [formatTokens(item.totalTokens)]),
      ]))

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart model-token-chart' }, {
        header: () => [
          h('span', { class: 'left' }, ['模型用量']),
          h('span', { class: 'right' }, (Object.keys(rangeLabel) as Range[]).map(key => h('span', {
            class: 'tab-item' + (range.value === key ? ' active' : ''),
            onClick: () => range.value = key,
          }, [rangeLabel[key]]))),
        ],
        default: () => h('div', { class: 'model-token-body' + (data.length ? ' has-legend' : ' is-empty') }, [
          h('div', { class: 'model-token-plot' }, [h(VChart, { option, autoresize: true })]),
          ...data.length ? [h('div', { class: 'model-token-legend' }, legend)] : [],
        ]),
      })
    }
  },
})

export default (ctx: Context) => {
  ctx.slot({
    type: 'analytic-chart',
    component: ModelTokenChart,
    order: 1,
  })
}
