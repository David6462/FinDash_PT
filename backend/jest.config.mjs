// Configuración de Jest para el backend en modo ESM nativo.
//
// - El proyecto es ESM ("type": "module"), así que Jest corre con
//   NODE_OPTIONS=--experimental-vm-modules (ver script "test" en package.json).
// - ts-jest transpila los .spec.ts con useESM: true.
// - tsconfig.spec.json hereda `isolatedModules: true` del tsconfig base, así
//   que ts-jest solo transpila (no type-check). El type-check completo lo hace
//   `nest build`. Más rápido y evita choques entre ts-jest 29 y TypeScript 6.
// - moduleNameMapper: el código fuente importa con extensión .js explícita
//   (obligatorio en ESM/nodenext); aquí se remapea a los .ts reales.

/** @type {import('jest').Config} */
export default {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  // reflect-metadata: los decoradores de NestJS/TypeORM lo necesitan en runtime
  // aunque el test instancie la clase a mano sin el contenedor DI.
  setupFiles: ['reflect-metadata'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
  // main.ts y el seed son entrypoints/scripts, no lógica de la app.
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/database/seed.ts',
  ],
  coverageDirectory: './coverage',
};
