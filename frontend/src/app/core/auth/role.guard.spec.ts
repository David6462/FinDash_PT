import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { AccountRole } from '../models';
import { roleGuard } from './role.guard';
import { AuthStore } from './auth.store';

describe('roleGuard', () => {
  let role: AccountRole | null;
  let createUrlTreeSpy: jasmine.Spy;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/admin' } as RouterStateSnapshot;

  beforeEach(() => {
    role = null;
    createUrlTreeSpy = jasmine
      .createSpy('createUrlTree')
      .and.returnValue('URL_TREE');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { role: () => role } },
        { provide: Router, useValue: { createUrlTree: createUrlTreeSpy } },
      ],
    });
  });

  function run(allowed: AccountRole[]) {
    return TestBed.runInInjectionContext(() => roleGuard(allowed)(route, state));
  }

  it('permite el acceso cuando el rol está en la lista', () => {
    role = 'ADMIN';
    expect(run(['ADMIN'])).toBe(true);
    expect(createUrlTreeSpy).not.toHaveBeenCalled();
  });

  it('redirige a /forbidden cuando el rol no está permitido', () => {
    role = 'CLIENT';
    expect(run(['ADMIN'])).toBe('URL_TREE' as never);
    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/forbidden']);
  });

  it('redirige a /forbidden cuando no hay rol (sin sesión)', () => {
    role = null;
    expect(run(['ADMIN', 'CLIENT'])).toBe('URL_TREE' as never);
    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/forbidden']);
  });
});
