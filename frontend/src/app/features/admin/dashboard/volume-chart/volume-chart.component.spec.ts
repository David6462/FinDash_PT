import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumeByTier } from '../../../../core/models';
import { VolumeChartComponent } from './volume-chart.component';

describe('VolumeChartComponent', () => {
  let fixture: ComponentFixture<VolumeChartComponent>;
  let component: VolumeChartComponent;

  const data: VolumeByTier[] = [
    { tier: 'BASIC', totalVolume: '1000.00', transactionCount: 5 },
    { tier: 'PREMIUM', totalVolume: '2500.50', transactionCount: 3 },
    { tier: 'DESCONOCIDO', totalVolume: '10.00', transactionCount: 1 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumeChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(VolumeChartComponent);
    component = fixture.componentInstance;
  });

  it('renderiza un chart cuando llegan datos', () => {
    fixture.componentRef.setInput('volumeByTier', data);
    fixture.detectChanges();
    const canvas: HTMLCanvasElement =
      fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
    // El effect creó la instancia de Chart.js sin lanzar.
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('actualiza el chart existente cuando cambian los datos', () => {
    fixture.componentRef.setInput('volumeByTier', data);
    fixture.detectChanges();

    fixture.componentRef.setInput('volumeByTier', [
      { tier: 'BASIC', totalVolume: '9999.00', transactionCount: 9 },
    ]);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('ngOnDestroy limpia la instancia del chart sin lanzar', () => {
    fixture.componentRef.setInput('volumeByTier', data);
    fixture.detectChanges();
    expect(() => component.ngOnDestroy()).not.toThrow();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
