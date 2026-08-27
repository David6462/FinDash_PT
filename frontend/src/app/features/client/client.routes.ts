import { Routes } from '@angular/router';

import { ClientLayoutComponent } from './client-layout/client-layout.component';
import { MovementsListComponent } from './movements/movements-list/movements-list.component';
import { TransferFormComponent } from './transfer/transfer-form/transfer-form.component';

/** Rutas hijas de /client. Todas se renderizan dentro del ClientLayout. */
export const CLIENT_ROUTES: Routes = [
  {
    path: '',
    component: ClientLayoutComponent,
    children: [
      { path: 'transfer', component: TransferFormComponent },
      { path: 'movements', component: MovementsListComponent },
      { path: '', pathMatch: 'full', redirectTo: 'transfer' },
    ],
  },
];
