<template>
  <div class="dashboard-shell">
    <number-grid></number-grid>
    <div class="card-grid chart-grid"><k-slot name="analytic-chart"></k-slot></div>
  </div>
</template>

<script lang="ts" setup>

import NumberGrid from './numbers/index.vue'

</script>

<style lang="scss">

.card-grid {
  display: grid;
  grid-gap: var(--card-margin);
}

.dashboard-shell {
  margin: var(--card-margin);
  display: grid;
  gap: var(--card-margin);
}

.chart-grid {
  .echarts {
    max-width: 100%;
    margin: 0 auto;
  }

  .model-token-chart {
    grid-column: 1 / -1;
  }

  .model-token-chart .echarts {
    width: 100%;
    height: 470px;
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(2, 1fr);

    @media (min-width: 1600px) {
      .echarts {
        width: 600px;
        height: 400px;
        max-width: 100%;
        margin: 0 auto;
      }

      .model-token-chart .echarts {
        width: 100%;
        height: 470px;
      }
    }

    @media (max-width: 1600px) {
      .echarts {
        width: 480px;
        height: 360px;
      }

      .model-token-chart .echarts {
        width: 100%;
        height: 460px;
      }
    }
  }

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;

    @media (min-width: 768px) {
      .echarts {
        width: 800px;
        height: 400px;
      }

      .model-token-chart .echarts {
        width: 100%;
        height: 430px;
      }
    }

    @media (max-width: 768px) and (min-width: 480px) {
      .echarts {
        width: 600px;
        height: 400px;
      }

      .model-token-chart .echarts {
        width: 100%;
        height: 320px;
      }
    }

    @media (max-width: 480px) {
      .echarts {
        width: 100%;
        height: 300px;
      }

      .model-token-chart .echarts {
        height: 280px;
      }
    }
  }
}

.page-home .welcome {
  display: none;
}

</style>
