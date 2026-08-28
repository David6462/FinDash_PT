import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginationMeta } from '../../../core/models';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  const meta = (over: Partial<PaginationMeta> = {}): PaginationMeta => ({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    ...over,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
  });

  it('totalPages nunca baja de 1', () => {
    fixture.componentRef.setInput('meta', meta({ totalPages: 0 }));
    expect(component.totalPages()).toBe(1);

    fixture.componentRef.setInput('meta', null);
    expect(component.totalPages()).toBe(1);
  });

  it('go() emite pageChange dentro de rango', () => {
    fixture.componentRef.setInput('meta', meta({ page: 2, totalPages: 5 }));
    const emitted: number[] = [];
    component.pageChange.subscribe((p) => emitted.push(p));

    component.go(3);
    component.go(1);

    expect(emitted).toEqual([3, 1]);
  });

  it('go() ignora páginas fuera de rango', () => {
    fixture.componentRef.setInput('meta', meta({ page: 1, totalPages: 3 }));
    const emitted: number[] = [];
    component.pageChange.subscribe((p) => emitted.push(p));

    component.go(0);
    component.go(4);

    expect(emitted).toEqual([]);
  });

  it('deshabilita "Anterior" en la primera página y "Siguiente" en la última', () => {
    fixture.componentRef.setInput('meta', meta({ page: 1, totalPages: 1 }));
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
  });
});
