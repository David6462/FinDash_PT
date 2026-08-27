import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { PaginationMeta } from '../../../core/models';

/**
 * Paginación reusable: "anterior / siguiente" + indicador "Página X de Y".
 * Recibe `meta` y emite `pageChange` con el número de página solicitado.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as m) {
      <nav class="pager" aria-label="Paginación">
        <button
          type="button"
          class="pager__btn"
          [disabled]="m.page <= 1"
          (click)="go(m.page - 1)"
        >
          ‹ Anterior
        </button>

        <span class="pager__status">
          Página {{ m.page }} de {{ totalPages() }}
        </span>

        <button
          type="button"
          class="pager__btn"
          [disabled]="m.page >= totalPages()"
          (click)="go(m.page + 1)"
        >
          Siguiente ›
        </button>
      </nav>
    }
  `,
  styles: [
    `
      .pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .pager__btn {
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--fd-navy-800);
        background: #fff;
        border: 1px solid var(--fd-border);
        border-radius: 8px;
        padding: 0.45rem 0.8rem;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .pager__btn:hover:not(:disabled) {
        border-color: var(--fd-blue-500);
        background: #f4f8ff;
      }
      .pager__btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .pager__status {
        font-size: 0.82rem;
        color: var(--fd-ink-600);
      }
    `,
  ],
})
export class PaginationComponent {
  readonly meta = input.required<PaginationMeta | null>();
  readonly pageChange = output<number>();

  /** Al menos 1, para no mostrar "de 0" cuando no hay datos. */
  readonly totalPages = computed(() => Math.max(1, this.meta()?.totalPages ?? 1));

  go(page: number): void {
    const total = this.totalPages();
    if (page >= 1 && page <= total) {
      this.pageChange.emit(page);
    }
  }
}
