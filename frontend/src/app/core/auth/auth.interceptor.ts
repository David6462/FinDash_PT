import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from './auth.store';

/**
 * Añade `Authorization: Bearer <token>` cuando hay sesión. Ante un 401,
 * cierra sesión y redirige a /login: un token vencido no debe dejar al
 * usuario viendo errores repetidos.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.token();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && authStore.isAuthenticated()) {
        authStore.logout();
      }
      return throwError(() => error);
    }),
  );
};
