import { store } from '@koishijs/client'

export const modelColors = [
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

function hashString(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

// 颜色基准顺序：模型用量的排名（服务端按 totalTokens 降序），
// 加上 extras 里出现的其他模型。用量图、性能面板等所有图表
// 共用同一份顺序取色，保证同名模型在不同图表间颜色一致。
export function canonicalModelOrder(
  range: 'day' | 'week' | 'month',
  extras: string[] = [],
): string[] {
  const usage = store.analytics?.chatlunaModelUsage?.[range] || []
  const order = usage.map(item => item.model)
  for (const name of extras) {
    if (!order.includes(name)) order.push(name)
  }
  return order
}

export function modelColorIndex(name: string, order: string[]) {
  const rank = order.indexOf(name)
  if (rank >= 0) return rank % modelColors.length
  return hashString(name) % modelColors.length
}

export function modelColor(name: string, order: string[]) {
  return modelColors[modelColorIndex(name, order)]
}
