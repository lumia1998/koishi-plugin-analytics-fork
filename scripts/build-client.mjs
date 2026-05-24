import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { build } = require('@koishijs/client/lib')

await build(process.cwd(), {
  plugins: [{
    name: 'fuck-echarts',
    renderChunk(code, chunk) {
      if (chunk.fileName.includes('echarts')) {
        return code.replace(/\bSymbol(?!\.toStringTag)/g, 'FuckSymbol')
      }
    },
  }],
})
