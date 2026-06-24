import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { BarChart, LineChart, SunburstChart } from 'echarts/charts'
import VChart from 'vue-echarts'

use([BarChart, CanvasRenderer, GridComponent, LineChart, TooltipComponent, LegendComponent, SunburstChart])

export default VChart
