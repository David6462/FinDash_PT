import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { AccountStatus, AccountTier } from '../../../common/enums/index.js';
import { User } from '../../users/entities/user.entity.js';
import { Transaction } from '../../transactions/entities/transaction.entity.js';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  accountNumber: string;

  /**
   * Saldo de la cuenta.
   * Se usa numeric(14,2) — NUNCA float/double: los tipos de punto flotante
   * introducen errores de redondeo inaceptables al manejar dinero real.
   * TypeORM devuelve numeric como string; la conversión a un tipo decimal
   * seguro se hará en la capa de negocio (etapa posterior).
   */
  @Column('numeric', { precision: 14, scale: 2, default: 0 })
  balance: string;

  /**
   * Nivel de la cuenta. Determina las reglas de comisión (etapa posterior).
   */
  @Column({ type: 'enum', enum: AccountTier, default: AccountTier.BASIC })
  tier: AccountTier;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  /**
   * Dueño de la cuenta. ManyToOne: un usuario puede tener varias cuentas.
   */
  @ManyToOne(() => User, (user) => user.accounts, { nullable: false })
  owner: Relation<User>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.sourceAccount)
  outgoingTransactions: Relation<Transaction[]>;

  @OneToMany(() => Transaction, (transaction) => transaction.destinationAccount)
  incomingTransactions: Relation<Transaction[]>;
}
