import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

import { VolumeByTier } from '../../../../core/models';

Chart.register(...registerables);

/** Color por tier, alineado con la paleta del login/marca. */
const TIER_COLORS: Record<string, string> = {
  BASIC: '#1d63d1',
  PREMIUM: '#10b981',
  CORPORATE: '#7c3aed',
};

/**
 * RF-08 — Gráfico de barras: volumen COMPLETED por tier de la cuenta origen.
 * Presentacional puro: recibe los datos por signal input, NO inyecta stores.
 */
@Component({
  selector: 'app-volume-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-box">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [
    `
      .chart-box {
        position: relative;
        height: 300px;
      }
    `,
  ],
})
export class VolumeChartComponent implements OnDestroy {
  readonly volumeByTier = input<VolumeByTier[]>([]);

  private readonly canvas =
    viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  private chart?: Chart;

  constructor() {
    // Se re-ejecuta cuando cambian los datos o cuando la vista monta el canvas.
    effect(() => {
      const data = this.volumeByTier();
      const canvasEl = this.canvas()?.nativeElement;
      if (!canvasEl) {
        return;
      }
      this.renderChart(canvasEl, data);
    });
  }

  ngOnDestroy(): void {
    // Evita memory leaks al navegar fuera y volver.
    this.chart?.destroy();
    this.chart = undefined;
  }

  private renderChart(canvasEl: HTMLCanvasElement, data: VolumeByTier[]): void {
    const labels = data.map((item) => item.tier);
    const values = data.map((item) => Number(item.totalVolume));
    const colors = data.map((item) => TIER_COLORS[item.tier] ?? '#7b8794');

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0]!.data = values;
      this.chart.data.datasets[0]!.backgroundColor = colors;
      this.chart.update();
      return;
    }

    this.chart = new Chart(canvasEl, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Volumen transaccionado',
            data: values,
            backgroundColor: colors,
            borderRadius: 6,
            maxBarThickness: 96,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ` ${Number(ctx.parsed.y ?? 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => Number(value).toLocaleString('en-US'),
            },
          },
        },
      },
    });
  }
}
