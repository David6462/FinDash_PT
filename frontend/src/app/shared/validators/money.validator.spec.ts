import { FormControl } from '@angular/forms';

import { maxTwoDecimals } from './money.validator';

/** Ejecuta el validador contra un control con el valor dado. */
function validate(value: unknown): ReturnType<typeof maxTwoDecimals> {
  return maxTwoDecimals(new FormControl(value));
}

describe('maxTwoDecimals', () => {
  it('no valida (pasa) cuando el valor está vacío', () => {
    expect(validate(null)).toBeNull();
    expect(validate(undefined)).toBeNull();
    expect(validate('')).toBeNull();
  });

  it('acepta enteros y hasta 2 decimales', () => {
    expect(validate(10)).toBeNull();
    expect(validate('10')).toBeNull();
    expect(validate(10.5)).toBeNull();
    expect(validate('10.55')).toBeNull();
    expect(validate('-5.25')).toBeNull();
  });

  it('rechaza más de 2 decimales', () => {
    expect(validate(10.123)).toEqual({ maxTwoDecimals: true });
    expect(validate('0.001')).toEqual({ maxTwoDecimals: true });
  });

  it('rechaza valores no numéricos', () => {
    expect(validate('abc')).toEqual({ maxTwoDecimals: true });
    expect(validate('1,50')).toEqual({ maxTwoDecimals: true });
  });
});
