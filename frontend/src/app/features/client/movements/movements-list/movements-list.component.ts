import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Transaction } from '../../../../core/models';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { MovementsStore } from '../movements.store';

type Direction = 'in' | 'out' | 'unknown';

@Component({
  selector: 'app-movements-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './movements-list.component.html',
  styleUrl: './movements-list.component.scss',
})
export class MovementsListComponent {
  protected readonly store = inject(MovementsStore);

  private readonly myAccounts = computed(
    () => new Set(this.store.myAccountNumbers()),
  );

  constructor() {
    this.load(1);
  }

  load(page: number): void {
    this.store.load(page).subscribe({ error: () => undefined });
  }

  direction(tx: Transaction): Direction {
    const mine = this.myAccounts();
    if (tx.sourceAccount && mine.has(tx.sourceAccount.accountNumber)) {
      return 'out';
    }
    if (tx.destinationAccount && mine.has(tx.destinationAccount.accountNumber)) {
      return 'in';
    }
    return 'unknown';
  }

  counterparty(tx: Transaction): string {
    const dir = this.direction(tx);
    if (dir === 'out') {
      return tx.destinationAccount?.accountNumber ?? '—';
    }
    if (dir === 'in') {
      return tx.sourceAccount?.accountNumber ?? '—';
    }
    return tx.destinationAccount?.accountNumber ?? '—';
  }
}
