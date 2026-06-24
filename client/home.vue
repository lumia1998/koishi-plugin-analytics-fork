<template>
  <div class="dashboard-shell">
    <number-grid></number-grid>
    <div class="featured-row">
      <div class="featured-wide">
        <ModelTrendChart></ModelTrendChart>
      </div>
      <div class="featured-narrow">
        <ModelPerformancePanel></ModelPerformancePanel>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>

import NumberGrid from './numbers/index.vue'
import { ModelTrendChart } from './charts/model-token'
import { ModelPerformancePanel } from './charts/model-performance'

</script>

<style lang="scss">

.dashboard-shell {
  margin: var(--card-margin);
  display: grid;
  gap: var(--card-margin);
}

.tab-content {
  display: grid;
  gap: var(--card-margin);
  padding-top: var(--card-margin);
}

.featured-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--card-margin);
  align-items: stretch;

  @media screen and (max-width: 1280px) {
    grid-template-columns: 1fr;
    margin-bottom: var(--card-margin);
  }
}

.featured-wide {
  grid-column: 1 / 4;
  min-width: 0;
  display: flex;
  flex-direction: column;

  > * {
    flex: 1;
  }
}

.featured-narrow {
  grid-column: 4;
  min-width: 0;
  display: flex;
  flex-direction: column;

  > * {
    flex: 1;
  }
}

.chart-grid {
  .echarts {
    max-width: 100%;
    margin: 0 auto;
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

    }

    @media (max-width: 1600px) {
      .echarts {
        width: 480px;
        height: 360px;
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

    }

    @media (max-width: 768px) and (min-width: 480px) {
      .echarts {
        width: 600px;
        height: 400px;
      }

    }

    @media (max-width: 480px) {
      .echarts {
        width: 100%;
        height: 300px;
      }
    }
  }
}

.page-home .welcome,
.page-home > .k-content > .welcome,
.welcome {
  display: none !important;
}

</style>
