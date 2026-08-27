import { computed, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountRole, SessionUser } from '../models';

interface LoginResponse {
  accessToken: string;
}

/** Payload que firma `backend/src/modules/auth/auth.service.ts`. */
interface JwtPayload {
  sub: string;
  documentNumber: string;
  role: AccountRole;
  iat: number;
  exp: number;
}

const TOKEN_KEY = 'findash.token';
const USER_KEY = 'findash.user';

/**
 * Único punto de acceso al estado de autenticación (RNF-03). Ningún componente
 * habla con HttpClient: piden datos y accionan métodos aquí, y leen signals.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<SessionUser | null>(null);
  private readonly _token = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly role = computed<AccountRole | null>(() => this._user()?.role ?? null);

  constructor() {
    this.restoreSession();
  }

  /**
   * POST /auth/login. Al resolver: guarda el token, deriva el usuario del
   * payload del JWT (sin otra llamada al backend) y persiste todo en
   * localStorage para sobrevivir a un refresh de página.
   */
  login(documentNumber: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        documentNumber,
        password,
      })
      .pipe(tap((res) => this.setSession(res.accessToken)));
  }

  /** Limpia estado y storage, y devuelve al usuario al login. */
  logout(): void {
    this._user.set(null);
    this._token.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    void this.router.navigate(['/login']);
  }

  private setSession(token: string): void {
    const user = this.userFromToken(token);
    if (!user) {
      this.logout();
      return;
    }
    this._token.set(token);
    this._user.set(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private restoreSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return;
    }

    const user = this.userFromToken(token);
    if (!user) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return;
    }

    this._token.set(token);
    this._user.set(user);
  }

  /** Decodifica el JWT y valida expiración. Devuelve null si no sirve. */
  private userFromToken(token: string): SessionUser | null {
    try {
      const payload = jwtDecode<JwtPayload>(token);
      if (payload.exp && payload.exp * 1000 <= Date.now()) {
        return null;
      }
      return {
        id: payload.sub,
        documentNumber: payload.documentNumber,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }
}
