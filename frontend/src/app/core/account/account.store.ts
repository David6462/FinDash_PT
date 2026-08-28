import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Account } from '../models';

/**
 * Estado compartido de la cuenta del usuario autenticado (RF-02: el Cliente
 * debe poder ver su propio saldo). Sigue el patrón Store con signals (RNF-03):
 * ningún componente habla con HttpClient, piden datos acá y leen el signal.
 *
 * Simplificación consciente "un usuario = una cuenta" (ya documentada en
 * LoadAndValidateAccountsStep del backend): GET /accounts/me devuelve un array
 * y acá tomamos la PRIMERA cuenta.
 */
@Injectable({ providedIn: 'root' })
export class AccountStore {
  private readonly http = inject(HttpClient);

  private readonly _myAccount = signal<Account | null>(null);
  readonly myAccount = this._myAccount.asReadonly();

  /**
   * GET /accounts/me. Toma la primera cuenta del array y actualiza el signal.
   * Si la respuesta viene vacía, deja el signal en null. Un error no rompe el
   * layout: se traga y el signal conserva su valor previo.
   */
  load(): Observable<Account | null> {
    return this.http
      .get<Account[]>(`${environment.apiUrl}/accounts/me`)
      .pipe(
        map((accounts) => accounts[0] ?? null),
        tap((account) => this._myAccount.set(account)),
        catchError(() => of(this._myAccount())),
      );
  }

  /**
   * Alias de `load()`, pensado para llamarse explícitamente después de una
   * transferencia exitosa y refrescar el saldo en la topbar (y donde se muestre)
   * al instante, sin que el usuario recargue el navegador.
   */
  refresh(): Observable<Account | null> {
    return this.load();
  }
}
