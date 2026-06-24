import { Context } from '@koishijs/client'
import CommandChart from './command'
import HistoryChart from './history'
import ModelTokenChart from './model-token'
import ModelPerformanceChart from './model-performance'

export default (ctx: Context) => {
  ctx.plugin(HistoryChart)
  ctx.plugin(ModelTokenChart)
  ctx.plugin(ModelPerformanceChart)
  ctx.plugin(CommandChart)
}
