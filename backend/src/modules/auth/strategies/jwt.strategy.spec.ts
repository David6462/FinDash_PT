import { ConfigService } from '@nestjs/config';
import { JwtStrategy, type JwtPayload } from './jwt.strategy.js';
import { AccountRole } from '../../../common/enums/index.js';

describe('JwtStrategy.validate', () => {
  const configService = {
    getOrThrow: () => 'test-secret',
  } as unknown as ConfigService;

  it('mapea el payload del token a request.user (userId, documentNumber, role)', () => {
    const strategy = new JwtStrategy(configService);

    const payload: JwtPayload = {
      sub: 'user-uuid-1',
      documentNumber: 'CC-1990-0001',
      role: AccountRole.CLIENT,
    };

    expect(strategy.validate(payload)).toEqual({
      userId: 'user-uuid-1',
      documentNumber: 'CC-1990-0001',
      role: AccountRole.CLIENT,
    });
  });
});
