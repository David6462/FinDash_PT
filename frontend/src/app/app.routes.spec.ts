import { authGuard } from './core/auth/auth.guard';
import { routes } from './app.routes';

/**
 * `app.routes.ts` es configuración declarativa; este spec fija el contrato de
 * seguridad (que las zonas privadas queden detrás de guards) y ejercita los
 * `loadChildren` para que Istanbul los instrumente.
 */
describe('app routes', () => {
  const byPath = (path: string) => routes.find((r) => r.path === path)!;

  it('redirige la raíz a login', () => {
    expect(byPath('')).toEqual(
      jasmine.objectContaining({ redirectTo: 'login', pathMatch: 'full' }),
    );
  });

  it('protege /client con authGuard + un roleGuard', () => {
    const client = byPath('client');
    expect(client.canActivate?.length).toBe(2);
    expect(client.canActivate?.[0]).toBe(authGuard);
    expect(typeof client.canActivate?.[1]).toBe('function');
  });

  it('protege /admin con authGuard + un roleGuard', () => {
    const admin = byPath('admin');
    expect(admin.canActivate?.length).toBe(2);
    expect(admin.canActivate?.[0]).toBe(authGuard);
  });

  it('la wildcard cae en login', () => {
    expect(byPath('**')).toEqual(
      jasmine.objectContaining({ redirectTo: 'login' }),
    );
  });

  it('los loadChildren resuelven a arrays de rutas', async () => {
    const client = await byPath('client').loadChildren!();
    const admin = await byPath('admin').loadChildren!();
    expect(Array.isArray(client)).toBe(true);
    expect(Array.isArray(admin)).toBe(true);
  });
});
