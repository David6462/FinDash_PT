import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Account,
  PaginatedResult,
  PaginationMeta,
  Transaction,
} from '../../../core/models';

const PAGE_SIZE = 10;

@Injectable({ providedIn: 'root' })
export class MovementsStore {
  private readonly http = inject(HttpClient);

  readonly movements = signal<Transaction[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * accountNumbers de las cuentas propias, para decidir en la lista si un
   * movimiento es entrante o saliente. Se traen una sola vez (GET /accounts/me)
   * y se cachean; no ameritan un store aparte.
   */
  readonly myAccountNumbers = signal<string[]>([]);
  private myAccountsLoaded = false;

  load(page: number): Observable<PaginatedResult<Transaction>> {
    this.loading.set(true);
    this.error.set(null);

    return this.ensureMyAccounts().pipe(
      switchMap(() =>
        this.http.get<PaginatedResult<Transaction>>(
          `${environment.apiUrl}/transactions/me`,
          { params: { page, limit: PAGE_SIZE } },
        ),
      ),
      tap((result) => {
        this.movements.set(result.data);
        this.meta.set(result.meta);
      }),
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.extractMessage(err));
        this.movements.set([]);
        this.meta.set(null);
        return of<PaginatedResult<Transaction>>({
          data: [],
          meta: { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
        });
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  private ensureMyAccounts(): Observable<string[]> {
    if (this.myAccountsLoaded) {
      return of(this.myAccountNumbers());
    }
    return this.http
      .get<Account[]>(`${environment.apiUrl}/accounts/me`)
      .pipe(
        map((accounts) => accounts.map((account) => account.accountNumber)),
        tap((numbers) => {
          this.myAccountNumbers.set(numbers);
          this.myAccountsLoaded = true;
        }),
      );
  }

  private extractMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }
    const message = err.error?.message;
    if (typeof message === 'string') {
      return message;
    }
    return 'No se pudieron cargar los movimientos.';
  }
}
