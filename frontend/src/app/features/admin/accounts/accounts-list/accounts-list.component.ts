import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { AccountsStore } from '../accounts.store';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    AvatarComponent,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-list.component.html',
  styleUrl: './accounts-list.component.scss',
})
export class AccountsListComponent implements OnInit {
  protected readonly store = inject(AccountsStore);

  readonly documentNumberControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl('', { nonNullable: true });

  constructor() {
    // Filtro por documento: espera ~400ms sin tipear antes de disparar.
    this.documentNumberControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) =>
        this.store.updateFilters({ documentNumber: value.trim() }),
      );

    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.store.updateFilters({ status: value }));
  }

  ngOnInit(): void {
    this.store.load(1).subscribe();
  }

  onPageChange(page: number): void {
    this.store.load(page).subscribe();
  }
}
