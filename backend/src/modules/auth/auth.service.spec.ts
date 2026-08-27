import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { User } from '../users/entities/user.entity.js';
import { AccountRole } from '../../common/enums/index.js';

/**
 * No se usa el contenedor DI de Nest: se instancia AuthService con un
 * repository y un JwtService mockeados. bcrypt se ejercita de verdad (hashes
 * reales) para no depender de mocks de módulo bajo ESM.
 */
describe('AuthService.validateUser', () => {
  const CORRECT_PASSWORD = 'secret123';
  let service: AuthService;
  let usersRepository: { findOne: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let existingUser: User;

  beforeAll(async () => {
    existingUser = {
      id: 'user-uuid-1',
      documentNumber: '1122334455',
      fullName: 'Ada Lovelace',
      passwordHash: await hash(CORRECT_PASSWORD, 10),
      role: AccountRole.CLIENT,
      avatarUrl: null,
      createdAt: new Date(),
      accounts: [],
    } as unknown as User;
  });

  beforeEach(() => {
    usersRepository = { findOne: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    service = new AuthService(
      usersRepository as never,
      jwtService as never,
    );
  });

  it('devuelve el user cuando documento y contraseña son correctos', async () => {
    usersRepository.findOne.mockResolvedValue(existingUser);

    await expect(
      service.validateUser(existingUser.documentNumber, CORRECT_PASSWORD),
    ).resolves.toBe(existingUser);
  });

  it('lanza UnauthorizedException cuando el documento no existe', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.validateUser('0000000000', CORRECT_PASSWORD),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza UnauthorizedException cuando la contraseña es incorrecta', async () => {
    usersRepository.findOne.mockResolvedValue(existingUser);

    await expect(
      service.validateUser(existingUser.documentNumber, 'contraseña-mala'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('usa el MISMO tipo y mensaje de error en ambos fallos (no user enumeration)', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    const errUnknownUser = await service
      .validateUser('0000000000', CORRECT_PASSWORD)
      .catch((e) => e as UnauthorizedException);

    usersRepository.findOne.mockResolvedValue(existingUser);
    const errWrongPassword = await service
      .validateUser(existingUser.documentNumber, 'otra-cosa')
      .catch((e) => e as UnauthorizedException);

    expect(errUnknownUser).toBeInstanceOf(UnauthorizedException);
    expect(errWrongPassword).toBeInstanceOf(UnauthorizedException);
    expect(errUnknownUser.message).toBe(errWrongPassword.message);
    expect(errUnknownUser.getStatus()).toBe(errWrongPassword.getStatus());
  });
});

describe('AuthService.login', () => {
  it('firma un JWT cuyo payload lleva sub, documentNumber y role', () => {
    const sign = jest.fn().mockReturnValue('signed.jwt.token');
    const service = new AuthService(
      { findOne: jest.fn() } as never,
      { sign } as never,
    );

    const user = {
      id: 'user-uuid-1',
      documentNumber: '1122334455',
      role: AccountRole.ADMIN,
    } as User;

    expect(service.login(user)).toEqual({ accessToken: 'signed.jwt.token' });
    expect(sign).toHaveBeenCalledWith({
      sub: 'user-uuid-1',
      documentNumber: '1122334455',
      role: AccountRole.ADMIN,
    });
  });
});

describe('AuthService.register', () => {
  const buildService = () => {
    const created = { marker: 'created-entity' };
    const create = jest.fn().mockReturnValue(created);
    const save = jest.fn().mockImplementation(async (u: unknown) => u);
    const service = new AuthService(
      { create, save } as never,
      { sign: jest.fn() } as never,
    );
    return { service, create, save, created };
  };

  it('hashea la contraseña con bcrypt y persiste el User', async () => {
    const { service, create, save, created } = buildService();

    const dto: RegisterDto = {
      documentNumber: 'CC-9',
      fullName: 'Grace Hopper',
      password: 'secret123',
    };

    const result = await service.register(dto);

    expect(result).toBe(created);
    const createArg = create.mock.calls[0][0] as { passwordHash: string };
    expect(createArg.passwordHash).not.toBe(dto.password);
    await expect(compare(dto.password, createArg.passwordHash)).resolves.toBe(
      true,
    );
    expect(save).toHaveBeenCalledWith(created);
  });

  it('SIEMPRE fija role = CLIENT, aunque el request intente colar otro role', async () => {
    const { service, create } = buildService();

    // Se fuerza un `role: ADMIN` que un atacante podría mandar en el body.
    await service.register({
      documentNumber: 'CC-10',
      fullName: 'Mallory',
      password: 'secret123',
      role: AccountRole.ADMIN,
    } as RegisterDto);

    const createArg = create.mock.calls[0][0] as { role: AccountRole };
    expect(createArg.role).toBe(AccountRole.CLIENT);
  });
});
