import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AccountStore } from '../../../core/account/account.store';
import { AuthStore } from '../../../core/auth/auth.store';

/**
 * Contenedor de toda la zona CLIENT: barra superior + <router-outlet /> donde
 * se montan las pantallas hijas (Transferir / Mis Movimientos).
 */
@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.scss',
})
export class ClientLayoutComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly accountStore = inject(AccountStore);

  ngOnInit(): void {
    // RF-02: cargamos la cuenta del usuario para mostrar su saldo en la topbar.
    this.accountStore.load().subscribe();
  }
}
