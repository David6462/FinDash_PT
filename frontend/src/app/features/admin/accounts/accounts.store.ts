import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Account, PaginatedResult, PaginationMeta } from '../../../core/models';

export interface AccountsFilters {
  documentNumber?: string;
  status?: string;
}

const PAGE_SIZE = 10;

@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private readonly http = inject(HttpClient);

  readonly accounts = signal<Account[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filters = signal<AccountsFilters>({});

  load(page: number): Observable<PaginatedResult<Account>> {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams().set('page', page).set('limit', PAGE_SIZE);
    const { documentNumber, status } = this.filters();
    if (documentNumber) {
      params = params.set('documentNumber', documentNumber);
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http
      .get<PaginatedResult<Account>>(`${environment.apiUrl}/accounts`, { params })
      .pipe(
        tap((result) => {
          this.accounts.set(result.data);
          this.meta.set(result.meta);
        }),
        catchError((err: HttpErrorResponse) => {
          this.error.set(this.extractMessage(err));
          this.accounts.set([]);
          this.meta.set(null);
          return of<PaginatedResult<Account>>({
            data: [],
            meta: { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
          });
        }),
        finalize(() => this.loading.set(false)),
      );
  }

  /** Aplica filtros parciales, vuelve a page 1 y recarga. */
  updateFilters(partial: AccountsFilters): void {
    this.filters.update((current) => {
      const next = { ...current, ...partial };
      // string vacío = sin filtro
      if (!next.documentNumber) delete next.documentNumber;
      if (!next.status) delete next.status;
      return next;
    });
    this.load(1).subscribe();
  }

  private extractMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }
    const message = err.error?.message;
    if (typeof message === 'string') {
      return message;
    }
    return 'No se pudieron cargar las cuentas.';
  }
}
