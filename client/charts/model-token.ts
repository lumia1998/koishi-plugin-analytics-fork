import { Context, store } from '@koishijs/client'
import { defineAsyncComponent, defineComponent, h, ref, resolveComponent } from 'vue'
import type * as echarts from 'echarts'
import { emptyChart, Tooltip } from './utils'

const VChart = defineAsyncComponent(() => import('./echarts'))

type DistributionRange = 'day' | 'week' | 'month'
type TrendRange = 'week' | 'month' | 'all'

interface ModelTokenPoint {
  model: string
  requests: number
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  totalTokens: number
}

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

interface ModelTokenData extends ModelTokenPoint {
  name: string
  color: string
  distributionValue?: number
}

const distributionRangeLabel: Record<DistributionRange, string> = {
  day: '日',
  week: '周',
  month: '月',
}

const trendRangeLabel: Record<TrendRange, string> = {
  week: '周',
  month: '月',
  all: '全部',
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

const otherModelColor = '#94a3b8'

function trimFixed(value: number, fraction = 1) {
  return value.toFixed(fraction).replace(/\.0$/, '')
}

function formatTokens(tokens: number) {
  if (tokens >= 1000000000) return `${trimFixed(tokens / 1000000000, tokens < 10000000000 ? 1 : 0)}B`
  if (tokens >= 1000000) return `${trimFixed(tokens / 1000000, tokens < 10000000 ? 1 : 0)}M`
  if (tokens >= 1000) return `${trimFixed(tokens / 1000, tokens < 10000 ? 1 : 0)}K`
  return `${Math.round(tokens)}`
}

function formatCompact(value: number) {
  if (value >= 1000000000) return `${trimFixed(value / 1000000000)}B`
  if (value >= 1000000) return `${trimFixed(value / 1000000)}M`
  if (value >= 1000) return `${trimFixed(value / 1000)}K`
  return `${Math.round(value)}`
}

function formatPercent(value: number) {
  return `${trimFixed(value * 100, value < 0.1 ? 1 : 0)}%`
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

function createTokenData(range: DistributionRange): ModelTokenData[] {
  const usage = store.analytics?.chatlunaModelUsage?.[range] as ModelTokenPoint[] | undefined
  return (usage || [])
    .map((item, index) => ({
      name: item.model || '未知模型',
      model: item.model || '未知模型',
      requests: Math.max(0, item.requests || 0),
      inputTokens: Math.max(0, item.inputTokens || 0),
      outputTokens: Math.max(0, item.outputTokens || 0),
      cachedTokens: Math.max(0, item.cachedTokens || 0),
      totalTokens: Math.max(0, item.totalTokens || 0),
      color: modelColors[index % modelColors.length],
    }))
    .filter(item => item.requests > 0 || item.totalTokens > 0)
}

function createDisplayTokenData(data: ModelTokenData[], byTokens: boolean) {
  const sortedData = data
    .slice()
    .sort((left, right) => (byTokens ? right.totalTokens - left.totalTokens : right.requests - left.requests))
    .map((item, index) => ({
      ...item,
      color: modelColors[index % modelColors.length],
    }))

  if (sortedData.length <= 5) return sortedData

  const visible = sortedData.slice(0, 4)
  const others = sortedData.slice(4)
  const other = others.reduce<ModelTokenData>((result, item) => ({
    ...result,
    requests: result.requests + item.requests,
    inputTokens: result.inputTokens + item.inputTokens,
    outputTokens: result.outputTokens + item.outputTokens,
    cachedTokens: result.cachedTokens + item.cachedTokens,
    totalTokens: result.totalTokens + item.totalTokens,
  }), {
    name: '其他',
    model: '其他',
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    color: otherModelColor,
  })

  return [...visible, other]
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

const ModelDistributionChart = defineComponent({
  name: 'ModelDistributionChart',

  setup() {
    const range = ref<DistributionRange>('day')

    return () => {
      if (!store.analytics) return null

      const data = createTokenData(range.value)
      const totalTokens = data.reduce((sum, item) => sum + item.totalTokens, 0)
      const totalRequests = data.reduce((sum, item) => sum + item.requests, 0)
      const distributionTotal = totalTokens || totalRequests
      const displayData = createDisplayTokenData(data, totalTokens > 0)
      const distributionData = displayData.map(item => ({
        ...item,
        distributionValue: totalTokens ? item.totalTokens : item.requests,
      }))

      const option: echarts.EChartsOption = distributionData.length ? {
        color: distributionData.map(item => item.color),
        tooltip: Tooltip.item<ModelTokenData>(({ data: point }) => [
          point.name,
          `请求：${formatCompact(point.requests)}`,
          `Token：${formatTokens(point.totalTokens)}`,
          `占比：${formatPercent((point.distributionValue ?? point.totalTokens) / distributionTotal)}`,
        ].join('<br>')),
        series: [{
          name: '模型占比',
          type: 'pie',
          radius: ['54%', '78%'],
          center: ['50%', '50%'],
          minAngle: 1.5,
          minShowLabelAngle: 4,
          avoidLabelOverlap: true,
          padAngle: 0.45,
          selectedMode: false,
          label: {
            show: false,
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 2,
            borderRadius: 8,
          },
          emphasis: {
            scale: false,
          },
          data: distributionData.map(item => ({
            ...item,
            value: item.distributionValue,
            itemStyle: {
              color: item.color,
              borderColor: '#ffffff',
              borderWidth: 2,
              borderRadius: 8,
            },
          })),
        }],
      } : emptyChart()

      const rows = distributionData.map((item) => h('div', { class: 'model-distribution-row', style: `--model-color: ${item.color}` }, [
        h('div', { class: 'model-row-main' }, [
          h('span', { class: 'model-name', title: item.name }, [item.name]),
          h('span', { class: 'model-share' }, [formatPercent(item.distributionValue / distributionTotal)]),
        ]),
        h('div', { class: 'model-row-stats' }, [
          h('span', { class: 'model-requests' }, [
            h('strong', [formatCompact(item.requests)]),
            h('small', ['请求']),
          ]),
          h('span', { class: 'model-tokens' }, [
            h('strong', [formatTokens(item.totalTokens)]),
            h('small', ['Token']),
          ]),
        ]),
      ]))

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart model-distribution-card' }, {
        header: () => [
          h('span', { class: 'left' }, ['模型占比']),
          createTabs(distributionRangeLabel, range.value, value => range.value = value),
        ],
        default: () => h('div', { class: 'model-distribution-body' }, [
          h('div', { class: 'model-donut-wrap' }, [h(VChart, { option, autoresize: true })]),
          h('div', { class: 'model-distribution-table' }, [
            h('div', { class: 'model-table-rows' }, data.length ? rows : []),
          ]),
        ]),
      })
    }
  },
})

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

      const option: echarts.EChartsOption = data.length ? {
        color: data.map((_, index) => modelColors[index % modelColors.length]),
        grid: { top: 28, left: 64, right: 18, bottom: 52 },
        legend: {
          bottom: 0,
          left: 'center',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { color: '#6b7280', fontSize: 11 },
          data: data.map((item, index) => ({
            name: item.model,
            itemStyle: { color: modelColors[index % modelColors.length] },
          })),
        },
        tooltip: Tooltip.axis<number>((params) => {
          const index = params[0]?.dataIndex ?? 0
          const title = axisLabels[index] || ''
          const rows = params.map((item) => {
            const series = data[item.seriesIndex ?? 0]
            const point = series?.points[index]
            return `<span style="color:${item.color}">●</span> ${series?.model ?? item.seriesName}：${formatTokens(point?.totalTokens ?? 0)}`
          })
          const total = data.reduce((sum, s) => sum + (s.points[index]?.totalTokens ?? 0), 0)
          return [`日期：${title}`, ...rows, `合计：${formatTokens(total)}`].join('<br>')
        }),
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
            color: modelColors[index % modelColors.length],
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

export default (ctx: Context) => {
  ctx.slot({
    type: 'analytic-chart',
    component: ModelDistributionChart,
    order: 1,
  })
}
