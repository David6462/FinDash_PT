import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { AccountRole } from '../../../common/enums/index.js';
import { Account } from '../../accounts/entities/account.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Cédula / documento del cliente. Único a nivel de base de datos. */
  @Column({ unique: true })
  documentNumber: string;

  @Column()
  fullName: string;

  /**
   * Nunca sale en una respuesta HTTP: `toPlainOnly` deja que se asigne y se
   * lea en código, pero el ClassSerializerInterceptor global lo elimina al
   * serializar la entidad.
   */
  @Exclude({ toPlainOnly: true })
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: AccountRole, default: AccountRole.CLIENT })
  role: AccountRole;

  /** URL de imagen de perfil. Puede venir vacía. */
  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * Un usuario puede tener más de una cuenta a futuro (no es 1:1).
   * Lado inverso de Account.owner.
   */
  @OneToMany(() => Account, (account) => account.owner)
  accounts: Relation<Account[]>;
}
