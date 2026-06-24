import { Context, store } from '@koishijs/client'
import { defineAsyncComponent, defineComponent, h, ref, resolveComponent } from 'vue'
import type * as echarts from 'echarts'
import { Tooltip } from './utils'

const week = '日一二三四五六'
const VChart = defineAsyncComponent(() => import('./echarts'))
const receiveColor = '#1d4ed8'
const sendColor = '#16a34a'

interface HistoryPoint {
  name: string
  receive: number
  send: number
}

function createHistoryData(range: 'day' | 'week' | 'month'): HistoryPoint[] {
  const analytics = store.analytics
  if (!analytics?.messageByDate) return []

  const data: HistoryPoint[] = []

  if (range === 'day') {
    analytics.messageHistoryByHour?.forEach((stats, index) => {
      const date = new Date(Date.now() - index * 3600000)
      data.push({
        name: `${date.getHours()}:00`,
        receive: stats?.receive || 0,
        send: stats?.send || 0,
      })
    })
  } else {
    const days = range === 'week' ? 7 : 30
    for (let index = 0; index < days; index++) {
      const stats = analytics.messageByDate[index]
      const date = new Date(Date.now() - index * 86400000)
      data.push({
        name: date.toLocaleDateString('zh-CN'),
        receive: stats?.receive || 0,
        send: stats?.send || 0,
      })
    }
  }

  return data.reverse()
}

const HistoryMessageChart = defineComponent({
  name: 'HistoryMessageChart',

  setup() {
    const range = ref<'day' | 'week' | 'month'>('day')

    return () => {
      const data = createHistoryData(range.value)
      if (!data.length) return null

      const option: echarts.EChartsOption = {
        color: [receiveColor, sendColor],
        legend: {
          top: 0,
          right: 0,
          itemWidth: 16,
          itemHeight: 10,
          data: ['接收', '发送'],
        },
        grid: {
          top: 48,
          left: 48,
          right: 28,
          bottom: 36,
        },
        tooltip: Tooltip.axis<number>((params) => {
          const index = params[0]?.dataIndex ?? 0
          const point = data[index]
          const name = point?.name ?? params[0]?.name
          const title = range.value === 'day'
            ? `时间：${name}`
            : `${name} 星期${week[new Date(name).getDay()]}`
          return [
            title,
            `<span style="color:${receiveColor}">●</span> 接收：${point?.receive ?? 0}`,
            `<span style="color:${sendColor}">●</span> 发送：${point?.send ?? 0}`,
          ].join('<br>')
        }),
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: data.map(item => item.name),
        },
        yAxis: {
          type: 'value',
        },
        series: [{
          name: '接收',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: receiveColor,
          },
          itemStyle: {
            color: receiveColor,
          },
          data: data.map(item => item.receive),
        }, {
          name: '发送',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: sendColor,
          },
          itemStyle: {
            color: sendColor,
          },
          data: data.map(item => item.send),
        }],
      }

      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart' }, {
        header: () => [
          h('span', { class: 'left' }, ['历史消息数量']),
          h('span', { class: 'right' }, [
            h('span', {
              class: 'tab-item' + (range.value === 'day' ? ' active' : ''),
              onClick: () => range.value = 'day',
            }, ['最近一天']),
            h('span', {
              class: 'tab-item' + (range.value === 'week' ? ' active' : ''),
              onClick: () => range.value = 'week',
            }, ['最近一周']),
            h('span', {
              class: 'tab-item' + (range.value === 'month' ? ' active' : ''),
              onClick: () => range.value = 'month',
            }, ['最近一个月']),
          ]),
        ],
        default: () => h(VChart, { option, autoresize: true }),
      })
    }
  },
})

export default (ctx: Context) => {
  ctx.slot({
    type: 'analytic-chart',
    component: HistoryMessageChart,
    order: 0,
  })
}
