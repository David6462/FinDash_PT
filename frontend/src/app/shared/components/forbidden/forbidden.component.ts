import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="forbidden">
      <p class="code">403</p>
      <h1>Acceso no autorizado</h1>
      <p class="msg">Tu cuenta no tiene permisos para ver esta sección.</p>
      <a routerLink="/login" class="link">Volver al inicio</a>
    </section>
  `,
  styles: [
    `
      .forbidden {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 2rem;
        text-align: center;
      }
      .code {
        font-size: 3.5rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        color: var(--fd-navy-700);
        margin: 0;
      }
      h1 {
        margin: 0;
        font-size: 1.4rem;
        color: var(--fd-ink-900);
      }
      .msg {
        color: var(--fd-ink-600);
        margin: 0 0 1rem;
      }
      .link {
        color: var(--fd-blue-500);
        font-weight: 600;
        text-decoration: none;
      }
      .link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class ForbiddenComponent {}
