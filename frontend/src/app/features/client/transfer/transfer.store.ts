import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Transaction } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class TransferStore {
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastResult = signal<Transaction | null>(null);

  /**
   * Idempotency key del intento en curso. Se conserva entre llamadas a
   * `transfer()` para que un reintento manual tras un error de RED reuse la
   * MISMA key (y el backend deduplique). Se descarta (→ key nueva en el
   * próximo submit) cuando:
   *  - el intento arranca limpio (`startNewAttempt()` desde el form),
   *  - el usuario cambió monto/cuenta destino (`startNewAttempt()`),
   *  - ya llegó una respuesta del servidor: éxito o rechazo de negocio.
   */
  private idempotencyKey: string | null = null;

  /**
   * Marca el comienzo de un intento "limpio": el siguiente `transfer()`
   * generará una idempotency key nueva. Lo llama el form al montarse y ante
   * cualquier cambio en los datos.
   */
  startNewAttempt(): void {
    this.idempotencyKey = null;
  }

  transfer(
    destinationAccountNumber: string,
    amount: number,
  ): Observable<Transaction> {
    if (!this.idempotencyKey) {
      this.idempotencyKey = crypto.randomUUID();
    }
    const key = this.idempotencyKey;

    this.loading.set(true);
    this.error.set(null);

    return this.http
      .post<Transaction>(
        `${environment.apiUrl}/transactions/transfer`,
        { destinationAccountNumber, amount },
        { headers: { 'X-Idempotency-Key': key } },
      )
      .pipe(
        tap((tx) => {
          this.lastResult.set(tx);
          this.loading.set(false);
          // Hubo respuesta → el próximo submit arranca con key nueva.
          this.idempotencyKey = null;
        }),
        catchError((err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(this.extractMessage(err));

          // status 0 = fallo de RED del navegador (sin conexión, request que
          // no llegó a completar): NO tocamos la key, un reintento manual la
          // reusa. Cualquier otro status es una respuesta del servidor
          // (incluido el 504 del antifraude) → key nueva en el próximo submit.
          if (err.status !== 0) {
            this.idempotencyKey = null;
          }

          return throwError(() => err);
        }),
      );
  }

  /** Limpia error y resultado. Llamar al entrar/salir del form. */
  reset(): void {
    this.error.set(null);
    this.lastResult.set(null);
  }

  private extractMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
    }
    const message = err.error?.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }
    return 'No se pudo completar la transferencia.';
  }
}
