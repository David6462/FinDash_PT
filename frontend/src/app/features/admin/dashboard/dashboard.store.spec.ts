import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { environment } from '../../../../environments/environment';
import { DashboardStore } from './dashboard.store';

describe('DashboardStore', () => {
  let store: DashboardStore;
  let httpMock: HttpTestingController;

  const kpisUrl = `${environment.apiUrl}/dashboard/kpis`;
  const volumeUrl = `${environment.apiUrl}/dashboard/volume-by-tier`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(DashboardStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // forkJoin cancela la 2da suscripción cuando la 1ra falla: esa request
  // queda "cancelled", no pendiente.
  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('loadAll() dispara ambas llamadas en paralelo y actualiza al resolver', () => {
    store.loadAll();
    expect(store.loading()).toBe(true);

    const kpisReq = httpMock.expectOne(kpisUrl);
    const volumeReq = httpMock.expectOne(volumeUrl);

    kpisReq.flush({ totalVolumeTransacted: '5000.00', failedTransactionsCount: 3 });
    volumeReq.flush([
      { tier: 'BASIC', totalVolume: '1000.00', transactionCount: 10 },
    ]);

    expect(store.kpis()?.failedTransactionsCount).toBe(3);
    expect(store.volumeByTier().length).toBe(1);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('si una de las dos llamadas falla, setea error y corta el loading', () => {
    store.loadAll();

    httpMock
      .expectOne(kpisUrl)
      .flush({ totalVolumeTransacted: '0', failedTransactionsCount: 0 });
    httpMock
      .expectOne(volumeUrl)
      .flush({ message: 'Boom' }, { status: 500, statusText: 'Server Error' });

    expect(store.error()).toBe('No se pudieron cargar las métricas.');
    expect(store.loading()).toBe(false);
  });

  it('un fallo de red (status 0) muestra el mensaje de conexión', () => {
    store.loadAll();

    const volumeReq = httpMock.expectOne(volumeUrl);
    httpMock.expectOne(kpisUrl).error(new ProgressEvent('error'));
    expect(volumeReq.cancelled).toBe(true);

    expect(store.error()).toBe('No se pudo conectar con el servidor.');
    expect(store.loading()).toBe(false);
  });
});
