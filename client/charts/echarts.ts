import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { BarChart, LineChart, SunburstChart, PieChart } from 'echarts/charts'
import VChart from 'vue-echarts'

use([BarChart, CanvasRenderer, GridComponent, LineChart, TooltipComponent, LegendComponent, PieChart, SunburstChart, TitleComponent])

export default VChart
