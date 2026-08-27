// Config de cobertura "de gate": corre unit + e2e en una sola pasada para
// obtener un único número de cobertura sobre todo src/.
//
// Requiere Postgres levantado (los e2e arrancan la app real). Para el ciclo
// rápido de desarrollo, usar `npm test` (solo unit, sin DB).
//
// maxWorkers 1: los e2e comparten la misma DB (uno trunca la tabla de
// transacciones), así que todo corre serial para no pisarse.

import base from './jest.config.mjs';

/** @type {import('jest').Config} */
export default {
  ...base,
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  maxWorkers: 1,
};
