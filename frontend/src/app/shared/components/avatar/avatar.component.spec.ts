import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  /** Setea inputs y dispara ngOnChanges (TestBed no lo hace por asignación directa). */
  function applyInputs(avatarUrl: string | null, name: string): void {
    component.avatarUrl = avatarUrl;
    component.name = name;
    component.ngOnChanges();
  }

  it('sin URL va directo a iniciales (sin skeleton)', () => {
    applyInputs(null, 'John Doe');
    expect(component.state()).toBe('initials');
    expect(component.initials()).toBe('JD');
  });

  it('con URL arranca en skeleton hasta que la imagen resuelva', () => {
    applyInputs('https://example.com/a.png', 'John Doe');
    expect(component.state()).toBe('skeleton');
  });

  it('deriva iniciales de las 2 primeras palabras y "?" cuando no hay nombre', () => {
    applyInputs(null, 'ana maria lopez perez');
    expect(component.initials()).toBe('AM');

    applyInputs(null, '   ');
    expect(component.initials()).toBe('?');
  });

  it('el color de fondo es determinístico por nombre', () => {
    applyInputs(null, 'Carlos Ruiz');
    const first = component.bgColor();
    applyInputs(null, 'Carlos Ruiz');
    expect(component.bgColor()).toBe(first);
  });

  it('URL en blanco se trata como ausente', () => {
    applyInputs('   ', 'John Doe');
    expect(component.url()).toBeNull();
    expect(component.state()).toBe('initials');
  });

  it('load de la imagen → estado image; error → cae a iniciales', () => {
    applyInputs('https://example.com/a.png', 'John Doe');
    fixture.detectChanges();
    const img: HTMLImageElement =
      fixture.nativeElement.querySelector('img.avatar__img');

    img.dispatchEvent(new Event('load'));
    expect(component.state()).toBe('image');

    img.dispatchEvent(new Event('error'));
    expect(component.state()).toBe('initials');
  });
});
