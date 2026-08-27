import { Routes } from '@angular/router';

import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { AccountsListComponent } from './accounts/accounts-list/accounts-list.component';
import { DashboardViewComponent } from './dashboard/dashboard-view/dashboard-view.component';

/** Rutas hijas de /admin. Todas se renderizan dentro del AdminLayout. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardViewComponent },
      { path: 'accounts', component: AccountsListComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
