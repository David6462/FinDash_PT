import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { Repository } from 'typeorm';
import { AccountRole } from '../../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 10;

/**
 * Hash real pero de una contraseña que nadie usa. Se compara contra él cuando
 * el documento no existe, para que el tiempo de respuesta sea equivalente al
 * de "usuario existe pero contraseña mal" y no se pueda inferir la existencia
 * de una cuenta por timing.
 */
const DUMMY_HASH =
  '$2b$10$lWCLqw/WYX.JGl4pHc98leCXXI9tv/dTpBSRfVUBcoBPPa1qxzkPK';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Verifica documento + contraseña. Lanza SIEMPRE la misma excepción y el
   * mismo mensaje tanto si el usuario no existe como si la contraseña no
   * coincide: no revelar cuál de las dos falló evita user enumeration.
   */
  async validateUser(documentNumber: string, password: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { documentNumber },
    });

    const passwordMatches = await compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  /**
   * Firma un JWT. El payload lleva el role para que el RolesGuard autorice sin
   * consultar la DB en cada request.
   */
  login(user: User): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      documentNumber: user.documentNumber,
      role: user.role,
    };
    return { accessToken: this.jwtService.sign(payload) };
  }

  /**
   * Crea un usuario de prueba desde el endpoint público. Hashea la contraseña
   * con bcrypt (10 rounds) y FIJA el role a CLIENT: este camino nunca puede
   * crear un ADMIN, aunque el request traiga otro valor. Los ADMIN se crean
   * solo por seed script.
   */
  async register(dto: RegisterDto): Promise<User> {
    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS);
    const user = this.usersRepository.create({
      documentNumber: dto.documentNumber,
      fullName: dto.fullName,
      role: AccountRole.CLIENT,
      passwordHash,
    });
    return this.usersRepository.save(user);
  }
}
