import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { DashboardKpis, VolumeByTier } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly http = inject(HttpClient);

  readonly kpis = signal<DashboardKpis | null>(null);
  readonly volumeByTier = signal<VolumeByTier[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Dispara KPIs + volumen por tier en paralelo; actualiza al resolver ambas. */
  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      kpis: this.http.get<DashboardKpis>(`${environment.apiUrl}/dashboard/kpis`),
      volumeByTier: this.http.get<VolumeByTier[]>(
        `${environment.apiUrl}/dashboard/volume-by-tier`,
      ),
    }).subscribe({
      next: ({ kpis, volumeByTier }) => {
        this.kpis.set(kpis);
        this.volumeByTier.set(volumeByTier);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 0
            ? 'No se pudo conectar con el servidor.'
            : 'No se pudieron cargar las métricas.',
        );
        this.loading.set(false);
      },
    });
  }
}
