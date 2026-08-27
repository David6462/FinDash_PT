import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

const parse = (query: Record<string, unknown>) => {
  const dto = plainToInstance(PaginationQueryDto, query, {
    enableImplicitConversion: false,
  });
  return { dto, errors: validateSync(dto) };
};

describe('PaginationQueryDto', () => {
  it('sin params usa page=1 y limit=10', () => {
    const { dto, errors } = parse({});
    expect(errors).toHaveLength(0);
    expect(dto).toEqual({ page: 1, limit: 10 });
  });

  it('convierte los query params string a number', () => {
    const { dto, errors } = parse({ page: '2', limit: '25' });
    expect(errors).toHaveLength(0);
    expect(dto).toEqual({ page: 2, limit: 25 });
  });

  it('rechaza limit > 50', () => {
    const { errors } = parse({ limit: '100' });
    expect(errors).not.toHaveLength(0);
  });

  it('rechaza page < 1', () => {
    const { errors } = parse({ page: '0' });
    expect(errors).not.toHaveLength(0);
  });
});
