import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('authGuard', () => {
  let isAuthenticated: boolean;
  let createUrlTreeSpy: jasmine.Spy;

  const route = {} as ActivatedRouteSnapshot;
  const stateFor = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    isAuthenticated = false;
    createUrlTreeSpy = jasmine
      .createSpy('createUrlTree')
      .and.returnValue('URL_TREE');

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthStore,
          useValue: { isAuthenticated: () => isAuthenticated },
        },
        { provide: Router, useValue: { createUrlTree: createUrlTreeSpy } },
      ],
    });
  });

  function run(url = '/client/transfer') {
    return TestBed.runInInjectionContext(() => authGuard(route, stateFor(url)));
  }

  it('permite el acceso con sesión activa', () => {
    isAuthenticated = true;
    expect(run()).toBe(true);
    expect(createUrlTreeSpy).not.toHaveBeenCalled();
  });

  it('sin sesión redirige a /login con el returnUrl del destino', () => {
    isAuthenticated = false;

    const result = run('/admin/dashboard');

    expect(result).toBe('URL_TREE' as never);
    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/dashboard' },
    });
  });
});
