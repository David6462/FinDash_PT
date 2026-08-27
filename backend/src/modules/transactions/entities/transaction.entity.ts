import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TransactionStatus } from '../../../common/enums/index.js';
import { Account } from '../../accounts/entities/account.entity.js';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Cuenta origen de los fondos.
   * Nullable: una Transaction REJECTED puede registrarse antes de resolver las
   * cuentas (p. ej. cuenta destino inexistente). En una COMPLETED siempre va.
   */
  @ManyToOne(() => Account, (account) => account.outgoingTransactions, {
    nullable: true,
  })
  sourceAccount: Relation<Account> | null;

  /** Cuenta destino de los fondos. Nullable por el mismo motivo que sourceAccount. */
  @ManyToOne(() => Account, (account) => account.incomingTransactions, {
    nullable: true,
  })
  destinationAccount: Relation<Account> | null;

  /** Monto que el cliente pidió transferir, ANTES de comisión. numeric(14,2). */
  @Column('numeric', { precision: 14, scale: 2 })
  amount: string;

  /** Comisión calculada según el tier de la cuenta origen. numeric(14,2). */
  @Column('numeric', { precision: 14, scale: 2 })
  commissionCharged: string;

  /** amount + commissionCharged: lo que realmente se descuenta. numeric(14,2). */
  @Column('numeric', { precision: 14, scale: 2 })
  totalDebited: string;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  /**
   * Motivo del rechazo: fondos insuficientes, timeout del antifraude, etc.
   * Null cuando la transacción se completa.
   */
  @Column({ type: 'varchar', nullable: true })
  rejectionReason: string | null;

  /**
   * Clave de idempotencia. La unicidad a nivel de base de datos es lo que
   * previene duplicados (RN-01). NOT NULL y UNIQUE de forma obligatoria.
   */
  @Column({ unique: true })
  idempotencyKey: string;

  /**
   * Código de autorización. Se genera solo si la transacción se completa;
   * null en caso de rechazo.
   */
  @Column({ type: 'varchar', nullable: true })
  authorizationCode: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
