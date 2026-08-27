import { jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { AccountRole } from '../../../common/enums/index.js';

function contextWithUser(role: AccountRole | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite el acceso a un ADMIN en un endpoint que requiere ADMIN', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([AccountRole.ADMIN]);

    expect(guard.canActivate(contextWithUser(AccountRole.ADMIN))).toBe(true);
  });

  it('bloquea con ForbiddenException a un CLIENT en un endpoint que requiere ADMIN', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([AccountRole.ADMIN]);

    expect(() =>
      guard.canActivate(contextWithUser(AccountRole.CLIENT)),
    ).toThrow(ForbiddenException);
  });

  it('permite el acceso a cualquier rol autenticado si el endpoint no declara @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(contextWithUser(AccountRole.CLIENT))).toBe(true);
    expect(guard.canActivate(contextWithUser(AccountRole.ADMIN))).toBe(true);
  });

  it('bloquea cuando el endpoint requiere rol pero no hay usuario en el request', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([AccountRole.ADMIN]);

    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('trata una lista de roles vacía como "sin restricción"', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    expect(guard.canActivate(contextWithUser(AccountRole.CLIENT))).toBe(true);
  });
});
