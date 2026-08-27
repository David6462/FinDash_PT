import { buildTypeOrmOptions } from './typeorm.config.js';

function configWith(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  } as never;
}

describe('buildTypeOrmOptions', () => {
  it('mapea las variables de entorno a la conexión de Postgres', () => {
    const options = buildTypeOrmOptions(
      configWith({
        DB_HOST: 'db.internal',
        DB_PORT: '6543',
        DB_USER: 'findash',
        DB_PASSWORD: 'pw',
        DB_NAME: 'findash',
      }),
    ) as Record<string, unknown>;

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db.internal',
      port: 6543,
      username: 'findash',
      database: 'findash',
      autoLoadEntities: true,
    });
  });

  it('usa el puerto 5432 por defecto si DB_PORT no está definido', () => {
    const options = buildTypeOrmOptions(configWith({ DB_HOST: 'localhost' })) as {
      port: number;
    };

    expect(options.port).toBe(5432);
  });
});
