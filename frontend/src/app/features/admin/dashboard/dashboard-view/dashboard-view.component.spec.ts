import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardKpis, VolumeByTier } from '../../../../core/models';
import { DashboardStore } from '../dashboard.store';
import { DashboardViewComponent } from './dashboard-view.component';

describe('DashboardViewComponent', () => {
  let fixture: ComponentFixture<DashboardViewComponent>;

  const kpis = signal<DashboardKpis | null>(null);
  const volumeByTier = signal<VolumeByTier[]>([]);
  const loading = signal(false);
  const error = signal<string | null>(null);
  let loadAllSpy: jasmine.Spy;

  beforeEach(async () => {
    kpis.set(null);
    volumeByTier.set([]);
    loading.set(false);
    error.set(null);
    loadAllSpy = jasmine.createSpy('loadAll');

    await TestBed.configureTestingModule({
      imports: [DashboardViewComponent],
      providers: [
        {
          provide: DashboardStore,
          useValue: { kpis, volumeByTier, loading, error, loadAll: loadAllSpy },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardViewComponent);
  });

  it('dispara store.loadAll() en ngOnInit', () => {
    fixture.detectChanges();
    expect(loadAllSpy).toHaveBeenCalledTimes(1);
  });

  it('muestra los KPIs cuando el store los tiene', () => {
    kpis.set({ totalVolumeTransacted: '12345.60', failedTransactionsCount: 2 });
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('12,345.60');
  });

  it('muestra el error del store', () => {
    error.set('No se pudieron cargar las métricas.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.alert--error').textContent).toContain(
      'No se pudieron cargar las métricas.',
    );
  });
});
