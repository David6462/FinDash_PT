import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { maxTwoDecimals } from '../../../../shared/validators/money.validator';
import { TransferStore } from '../transfer.store';

@Component({
  selector: 'app-transfer-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transfer-form.component.html',
  styleUrl: './transfer-form.component.scss',
})
export class TransferFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  protected readonly store = inject(TransferStore);

  private sub?: Subscription;

  readonly form = this.fb.nonNullable.group({
    destinationAccountNumber: ['', [Validators.required]],
    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01), maxTwoDecimals],
    ],
  });

  ngOnInit(): void {
    // Entramos "desde cero": sin resultado ni error previos y con key nueva.
    this.store.reset();
    this.store.startNewAttempt();

    // Cambiar monto o cuenta destino invalida el intento anterior: el próximo
    // submit debe usar una idempotency key nueva.
    this.sub = this.form.valueChanges.subscribe(() => this.store.startNewAttempt());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.store.reset();
  }

  submit(): void {
    if (this.form.invalid || this.store.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { destinationAccountNumber, amount } = this.form.getRawValue();
    this.store
      .transfer(destinationAccountNumber, amount as number)
      .subscribe({
        // El estado (error / lastResult) ya lo maneja el store; acá solo
        // evitamos que el error no manejado llegue a la consola.
        error: () => undefined,
      });
  }
}
