import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { User } from '../users/entities/user.entity.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.authService.validateUser(
      dto.documentNumber,
      dto.password,
    );
    return this.authService.login(user);
  }

  /**
   * El passwordHash NO se devuelve: la entidad User lo marca con @Exclude() y
   * el ClassSerializerInterceptor global lo elimina de la respuesta.
   */
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<User> {
    return this.authService.register(dto);
  }
}
