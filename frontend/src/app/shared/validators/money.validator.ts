import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Rechaza montos con más de 2 decimales (el backend exige `maxDecimalPlaces: 2`).
 * No valida el signo ni el mínimo: eso lo cubren `Validators.min` / `required`.
 */
export const maxTwoDecimals: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return /^-?\d+(\.\d{1,2})?$/.test(String(value))
    ? null
    : { maxTwoDecimals: true };
};
