import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestRequest } from '@angular/common/http/testing';

import { environment } from '../../../../environments/environment';
import { Account, PaginatedResult } from '../../../core/models';
import { AccountsStore } from './accounts.store';

function emptyPage(page = 1): PaginatedResult<Account> {
  return { data: [], meta: { page, limit: 10, total: 0, totalPages: 0 } };
}

describe('AccountsStore', () => {
  let store: AccountsStore;
  let httpMock: HttpTestingController;

  const url = `${environment.apiUrl}/accounts`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccountsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(AccountsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('load() envía page y limit y por defecto ningún filtro', () => {
    store.load(3).subscribe();

    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('documentNumber')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush(emptyPage(3));

    expect(store.loading()).toBe(false);
  });

  it('load() incluye los filtros activos en el querystring', () => {
    store.filters.set({ documentNumber: 'CC-1', status: 'ACTIVE' });
    store.load(1).subscribe();

    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.get('documentNumber')).toBe('CC-1');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush(emptyPage());
  });

  it('updateFilters() aplica el filtro, resetea a page 1 y recarga', () => {
    store.updateFilters({ documentNumber: 'CC-9' });

    const req = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('documentNumber')).toBe('CC-9');
    req.flush(emptyPage());

    expect(store.filters()).toEqual({ documentNumber: 'CC-9' });
  });

  it('updateFilters() con string vacío elimina el filtro', () => {
    store.updateFilters({ documentNumber: 'CC-9' });
    httpMock.expectOne((r) => r.url === url).flush(emptyPage());

    store.updateFilters({ documentNumber: '' });
    const req: TestRequest = httpMock.expectOne((r) => r.url === url);
    expect(req.request.params.has('documentNumber')).toBe(false);
    req.flush(emptyPage());

    expect(store.filters()).toEqual({});
  });

  it('un error deja la lista vacía y setea el mensaje', () => {
    store.load(1).subscribe();
    httpMock
      .expectOne((r) => r.url === url)
      .flush({ message: 'Nope' }, { status: 500, statusText: 'Server Error' });

    expect(store.error()).toBe('Nope');
    expect(store.accounts()).toEqual([]);
    expect(store.meta()).toBeNull();
  });

  it('sin message legible cae al texto genérico', () => {
    store.load(1).subscribe();
    httpMock
      .expectOne((r) => r.url === url)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(store.error()).toBe('No se pudieron cargar las cuentas.');
  });

  it('un fallo de red (status 0) muestra el mensaje de conexión', () => {
    store.load(1).subscribe();
    httpMock
      .expectOne((r) => r.url === url)
      .error(new ProgressEvent('error'));

    expect(store.error()).toBe('No se pudo conectar con el servidor.');
  });
});
