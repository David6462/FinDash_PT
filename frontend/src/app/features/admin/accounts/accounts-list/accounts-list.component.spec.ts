import { signal } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { of } from 'rxjs';

import { Account, PaginationMeta } from '../../../../core/models';
import { AccountsStore } from '../accounts.store';
import { AccountsListComponent } from './accounts-list.component';

describe('AccountsListComponent', () => {
  let fixture: ComponentFixture<AccountsListComponent>;
  let component: AccountsListComponent;

  const accounts = signal<Account[]>([]);
  const meta = signal<PaginationMeta | null>(null);
  const loading = signal(false);
  const error = signal<string | null>(null);
  let loadSpy: jasmine.Spy;
  let updateFiltersSpy: jasmine.Spy;

  beforeEach(async () => {
    loadSpy = jasmine.createSpy('load').and.returnValue(of({ data: [], meta: null }));
    updateFiltersSpy = jasmine.createSpy('updateFilters');

    await TestBed.configureTestingModule({
      imports: [AccountsListComponent],
      providers: [
        {
          provide: AccountsStore,
          useValue: {
            accounts,
            meta,
            loading,
            error,
            load: loadSpy,
            updateFilters: updateFiltersSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga la primera página en ngOnInit', () => {
    expect(loadSpy).toHaveBeenCalledWith(1);
  });

  it('el filtro por documento aplica debounce (~400ms) y hace trim', fakeAsync(() => {
    component.documentNumberControl.setValue('  CC-1 ');
    tick(200);
    expect(updateFiltersSpy).not.toHaveBeenCalled();

    tick(300);
    expect(updateFiltersSpy).toHaveBeenCalledWith({ documentNumber: 'CC-1' });
  }));

  it('el filtro por estado aplica de inmediato', () => {
    component.statusControl.setValue('ACTIVE');
    expect(updateFiltersSpy).toHaveBeenCalledWith({ status: 'ACTIVE' });
  });

  it('onPageChange() delega en store.load', () => {
    component.onPageChange(4);
    expect(loadSpy).toHaveBeenCalledWith(4);
  });
});
