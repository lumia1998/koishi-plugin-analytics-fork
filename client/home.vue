<template>
  <number-grid></number-grid>
  <div class="card-grid chart-grid"><k-slot name="analytic-chart"></k-slot></div>
</template>

<script lang="ts" setup>

import NumberGrid from './numbers/index.vue'

</script>

<style lang="scss">

.card-grid {
  display: grid;
  margin: var(--card-margin);
  grid-gap: var(--card-margin);
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
    height: 390px;
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
        height: 420px;
      }
    }

    @media (max-width: 1600px) {
      .echarts {
        width: 480px;
        height: 360px;
      }

      .model-token-chart .echarts {
        width: 100%;
        height: 400px;
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
        height: 400px;
      }
    }

    @media (max-width: 768px) and (min-width: 480px) {
      .echarts {
        width: 600px;
        height: 400px;
      }

      .model-token-chart .echarts {
        width: 100%;
        height: 360px;
      }
    }

    @media (max-width: 480px) {
      .echarts {
        width: 100%;
        height: 300px;
      }

      .model-token-chart .echarts {
        height: 320px;
      }
    }
  }
}

.page-home .welcome {
  --welcome-title: 2rem;
  --welcome-padding: 1.5rem 2rem;
  --welcome-gap: 1rem;
  --welcome-choice-padding: 0.75rem 1rem;

  h1 {
    margin-bottom: 0.5rem;
  }

  .choice h2 {
    margin-top: 0.25rem;
    margin-bottom: 0.35rem;
  }

  .choice p {
    margin: 0.25rem 0;
  }

  @media screen and (max-width: 768px) {
    --welcome-title: 1.75rem;
    --welcome-padding: 1.25rem 1.25rem;
    --welcome-gap: 0.75rem;
  }
}

</style>
