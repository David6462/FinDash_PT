import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  signal,
} from '@angular/core';

type AvatarState = 'skeleton' | 'image' | 'initials';

/**
 * RF-04 — Avatar con fallback robusto:
 *  - `avatarUrl` null desde el inicio  → directo a iniciales (sin skeleton).
 *  - `avatarUrl` presente              → skeleton (shimmer) mientras carga la
 *    <img>; al `load` se muestra la imagen, al `error` (404 / URL rota) cae a
 *    iniciales.
 * Componente presentacional puro (sin stores): recibe todo por @Input().
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="avatar"
      [class.avatar--skeleton]="state() === 'skeleton'"
      [style.background]="state() === 'initials' ? bgColor() : null"
      [attr.aria-label]="name || 'Avatar'"
      role="img"
    >
      @if (state() === 'initials') {
        <span class="avatar__initials">{{ initials() }}</span>
      }

      @if (url()) {
        <img
          class="avatar__img"
          [class.avatar__img--visible]="state() === 'image'"
          [src]="url()"
          [alt]="name"
          (load)="state.set('image')"
          (error)="state.set('initials')"
        />
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        line-height: 0;
      }

      .avatar {
        position: relative;
        display: inline-grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--fd-border);
        color: #fff;
        user-select: none;
        flex-shrink: 0;
      }

      .avatar__initials {
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .avatar__img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .avatar__img--visible {
        opacity: 1;
      }

      .avatar--skeleton {
        background: linear-gradient(
          100deg,
          var(--fd-border) 30%,
          #eef2f7 50%,
          var(--fd-border) 70%
        );
        background-size: 200% 100%;
        animation: avatar-shimmer 1.2s ease-in-out infinite;
      }

      @keyframes avatar-shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class AvatarComponent implements OnChanges {
  @Input() avatarUrl: string | null = null;
  @Input() name = '';

  /** Paleta fija — el hash del nombre elige siempre el mismo color por usuario. */
  private static readonly PALETTE = [
    '#1d63d1',
    '#0e9f6e',
    '#0e7490',
    '#7c3aed',
    '#b45309',
    '#be185d',
  ];

  readonly state = signal<AvatarState>('initials');
  readonly url = signal<string | null>(null);
  readonly initials = signal('?');
  readonly bgColor = signal(AvatarComponent.PALETTE[0]);

  ngOnChanges(): void {
    const trimmedUrl = this.avatarUrl?.trim() || null;
    this.url.set(trimmedUrl);
    this.initials.set(this.computeInitials(this.name));
    this.bgColor.set(this.pickColor(this.name));
    // Sin URL: iniciales directo. Con URL: skeleton hasta load/error.
    this.state.set(trimmedUrl ? 'skeleton' : 'initials');
  }

  private computeInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return '?';
    }
    return words
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
  }

  private pickColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const palette = AvatarComponent.PALETTE;
    return palette[Math.abs(hash) % palette.length]!;
  }
}
