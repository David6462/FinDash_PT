import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Endpoint público de conveniencia para crear usuarios de prueba.
 *
 * NO acepta `role`: el registro público SIEMPRE crea usuarios con
 * role = CLIENT (lo fija AuthService.register). Para crear un ADMIN se usa el
 * seed script (`npm run seed`), nunca este endpoint.
 */
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
