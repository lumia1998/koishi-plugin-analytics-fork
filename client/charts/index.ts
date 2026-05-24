import { Context } from '@koishijs/client'
import CommandChart from './command'
import HistoryChart from './history'
import ModelTokenChart from './model-token'

export default (ctx: Context) => {
  // 用户数量增长 频道数量增长
  // 消息数量 (收/发) 每小时 QPS (收/发)
  // 指令调用频率 机器人消息频率

  ctx.plugin(HistoryChart)
  ctx.plugin(ModelTokenChart)
  ctx.plugin(CommandChart)
}
