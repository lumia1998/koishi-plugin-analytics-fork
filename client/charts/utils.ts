import { defineAsyncComponent, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, resolveComponent } from 'vue'
import type { Ref } from 'vue'
import { Store, store } from '@koishijs/client'
import type * as echarts from 'echarts'
import './index.scss'

const VChart = defineAsyncComponent(() => import('./echarts'))

export interface ChartOptions {
  title: string
  fields?: (keyof Store)[]
  showTab?: boolean
  options: (store: Store, tab: 'send' | 'receive') => echarts.EChartsOption
}

const tabValue = ref<'send' | 'receive'>('send')

export function emptyChart(): echarts.EChartsOption {
  return {
    title: {
      text: '暂无数据',
      left: 'center',
      top: 'center',
      textStyle: {
        color: '#999',
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
  }
}

export function createChart({ title, fields, showTab, options }: ChartOptions) {
  return defineComponent({
    render: () => {
      if (!fields.every(key => store[key])) return null
      const option = options(store, tabValue.value)
      if (!option) return
      return h(resolveComponent('k-card'), { class: 'frameless analytic-chart' }, {
        header: () => [
          h('span', { class: 'left' }, [title]),
          ...showTab ? [h('span', { class: 'right' }, [
            h('span', {
              class: 'tab-item' + (tabValue.value === 'send' ? ' active' : ''),
              onClick: () => tabValue.value = 'send',
            }, ['发送']),
            h('span', {
              class: 'tab-item' + (tabValue.value === 'receive' ? ' active' : ''),
              onClick: () => tabValue.value = 'receive',
            }, ['接收']),
          ])] : [],
        ],
        default: () => {
          return h(VChart, { option, autoresize: true })
        },
      })
    },
  })
}

interface CommonData {
  name: string
  value: number
  children?: CommonData
}

export namespace Tooltip {
  type FormatterCallback<T> = (params: T) => string
  type FormatterCallbackParams<T> = Omit<echarts.DefaultLabelFormatterCallbackParams, 'data'> & { data: T }

  export const item = <T = CommonData>(formatter: FormatterCallback<FormatterCallbackParams<T>>) => ({
    trigger: 'item',
    formatter,
  } as echarts.TooltipComponentOption)

  export const axis = <T = CommonData>(formatter: FormatterCallback<FormatterCallbackParams<T>[]>) => ({
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
    },
    formatter,
  } as echarts.TooltipComponentOption)
}

export function trimFixed(value: number, fraction = 1) {
  return value.toFixed(fraction).replace(/\.0$/, '')
}

export function formatTokens(tokens: number) {
  if (tokens >= 1000000000) return `${trimFixed(tokens / 1000000000, tokens < 10000000000 ? 1 : 0)}B`
  if (tokens >= 1000000) return `${trimFixed(tokens / 1000000, tokens < 10000000 ? 1 : 0)}M`
  if (tokens >= 1000) return `${trimFixed(tokens / 1000, tokens < 10000 ? 1 : 0)}K`
  return `${Math.round(tokens)}`
}

// Renders rows up to the container's measured capacity instead of a fixed
// count. capacity stays Infinity until the first measurement so rows render
// once to establish a real row height.
export function useRowCapacity(listEl: Ref<HTMLElement | undefined>) {
  const capacity = ref(Infinity)
  let observer: ResizeObserver | undefined

  function measure() {
    const el = listEl.value
    if (!el) return
    const style = getComputedStyle(el)
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
    const firstRow = el.firstElementChild as HTMLElement
    const rowHeight = firstRow?.getBoundingClientRect().height || 32
    const next = Math.max(1, Math.floor((el.clientHeight - padding) / rowHeight))
    if (next !== capacity.value) capacity.value = next
  }

  onMounted(async () => {
    await nextTick()
    measure()
    if (listEl.value) {
      observer = new ResizeObserver(measure)
      observer.observe(listEl.value)
    }
  })

  onBeforeUnmount(() => observer?.disconnect())

  return capacity
}
