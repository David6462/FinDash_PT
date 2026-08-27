import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';

/**
 * Contenedor de toda la zona CLIENT: barra superior + <router-outlet /> donde
 * se montan las pantallas hijas (Transferir / Mis Movimientos).
 */
@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.scss',
})
export class ClientLayoutComponent {
  protected readonly authStore = inject(AuthStore);
}
