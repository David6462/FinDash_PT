import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { VolumeChartComponent } from '../volume-chart/volume-chart.component';
import { DashboardStore } from '../dashboard.store';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [DecimalPipe, VolumeChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-view.component.html',
  styleUrl: './dashboard-view.component.scss',
})
export class DashboardViewComponent implements OnInit {
  protected readonly store = inject(DashboardStore);

  ngOnInit(): void {
    this.store.loadAll();
  }
}
