import { Context } from '@koishijs/client'
import type {} from '../src'
import Charts from './charts'
import Home from './home.vue'
import KoishiStats from './koishi-stats.vue'
import './icons'

import 'virtual:uno.css'

export default (ctx: Context) => {
  // ctx.app.provide('ecTheme', 'koishi-dark')
  ctx.plugin(Charts)

  ctx.slot({
    type: 'home',
    component: Home,
    order: 0,
  })

  ctx.page({
    path: '/analytics-koishi',
    name: 'Koishi 统计',
    icon: 'activity:chart',
    order: 500,
    component: KoishiStats,
  })
}
