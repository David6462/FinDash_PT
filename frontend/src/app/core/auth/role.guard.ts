import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AccountRole } from '../models';
import { AuthStore } from './auth.store';

/**
 * Factory: `roleGuard(['ADMIN'])` devuelve un CanActivateFn que exige que el
 * rol actual esté en la lista. Si no, manda a /forbidden.
 */
export const roleGuard = (allowedRoles: AccountRole[]): CanActivateFn => {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const role = authStore.role();
    if (role !== null && allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
};
