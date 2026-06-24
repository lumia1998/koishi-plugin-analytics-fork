<template>
  <div class="koishi-stats-page">
    <div class="card-grid chart-grid"><k-slot name="analytic-chart"></k-slot></div>
  </div>
</template>

<style lang="scss">
.koishi-stats-page {
  margin: var(--card-margin);
  display: grid;
  gap: var(--card-margin);
}

.koishi-stats-page .card-grid {
  display: grid;
  grid-gap: var(--card-margin);
}

.koishi-stats-page .chart-grid {
  @media (min-width: 1280px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
}

.koishi-stats-page .analytic-chart {
  .k-card-body {
    min-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .echarts {
    flex: 1;
    width: 100% !important;
    height: 100% !important;
  }
}
</style>
