import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AccountStore } from '../../../core/account/account.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { SessionUser } from '../../../core/models';
import { ClientLayoutComponent } from './client-layout.component';

describe('ClientLayoutComponent', () => {
  let loadSpy: jasmine.Spy;

  beforeEach(async () => {
    loadSpy = jasmine.createSpy('load').and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [ClientLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            user: signal<SessionUser | null>(null),
            logout: jasmine.createSpy('logout'),
          },
        },
        {
          provide: AccountStore,
          useValue: { myAccount: signal(null), load: loadSpy },
        },
      ],
    }).compileComponents();
  });

  it('se crea y carga la cuenta propia en ngOnInit (RF-02)', () => {
    const fixture = TestBed.createComponent(ClientLayoutComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });
});
