import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class TransferDto {
  /** accountNumber de la cuenta destino. */
  @IsString()
  @IsNotEmpty()
  destinationAccountNumber: string;

  /** Monto a transferir, ANTES de comisión. Máximo 2 decimales, positivo. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
