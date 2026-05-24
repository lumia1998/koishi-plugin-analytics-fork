import { Context, store } from '@koishijs/client'
import { defineAsyncComponent, defineComponent, h, ref, resolveComponent } from 'vue'
import type * as echarts from 'echarts'
import { emptyChart, Tooltip } from './utils'

const VChart = defineAsyncComponent(() => import('./echarts'))
const tokenColor = '#2563eb'

type Range = 'day' | 'week' | 'month'

interface ModelTokenPoint {
  model: string
  totalTokens: number
}

const rangeLabel: Record<Range, string> = {
  day: '最近一天',
  week: '最近一周',
  month: '最近一个月',
}

const axisInterval: Record<Range, number> = {
  day: 0.5,
  week: 5,
  month: 10,
}

function formatTokens(tokens: number) {
  if (tokens >= 1000000) return `${+(tokens / 1000000).toFixed(1)}M`
  if (tokens >= 1000) return `${+(tokens / 1000).toFixed(1)}K`
  return `${tokens}`
}

function createTokenData(range: Range) {
  const usage = store.analytics?.chatlunaModelUsage?.[range] as ModelTokenPoint[] | undefined
  return (usage || []).map(item => ({
    name: item.model || '未知模型',
    value: item.totalTokens / 1000000,
    totalTokens: item.totalTokens,
  }))
}

const ModelTokenChart = defineComponent({
  name: 'ModelTokenChart',

  setup() {
    const range = ref<Range>('day')

    return () => {
      if (!store.analytics) return null
      const data = createTokenData(range.value)
      const option: echarts.EChartsOption = data.length ? {
        color: [tokenColor],
        grid: {
          top: 32,
          left: 58,
          right: 24,
          bottom: 78,
        },
        tooltip: Tooltip.axis<{ value: number; dataIndex: number }>((params) => {
          const point = data[params[0]?.dataIndex ?? 0]
          return [
            point?.name ?? '',
            `Token 总量：${formatTokens(point?.totalTokens ?? 0)}`,
          ].join('<br>')
        }),
        xAxis: {
          type: 'category',
          data: data.map(item => item.name),
          axisLabel: {
            interval: 0,
            rotate: 35,
            width: 92,
            overflow: 'truncate',
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          interval: axisInterval[range.value],
          axisLabel: {
            formatter: (value: number) => `${value}M`,
          },
        },
        series: [{
          name: 'Token 总量',
          type: 'bar',
          barMaxWidth: 40,
          data: data.map(item => ({
            value: +item.value.toFixed(3),
            totalTokens: item.totalTokens,
          })),
          itemStyle: {
            color: tokenColor,
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            formatter: ({ data }: any) => formatTokens(data.totalTokens),
          },
        }],
      } : emptyChart()

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart' }, {
        header: () => [
          h('span', { class: 'left' }, ['按模型统计 Token']),
          h('span', { class: 'right' }, (Object.keys(rangeLabel) as Range[]).map(key => h('span', {
            class: 'tab-item' + (range.value === key ? ' active' : ''),
            onClick: () => range.value = key,
          }, [rangeLabel[key]]))),
        ],
        default: () => h(VChart, { option, autoresize: true }),
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