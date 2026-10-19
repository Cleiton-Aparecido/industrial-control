import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageMetadataResponseDto } from 'src/shared/http/page-response.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const decimalString = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : value;

export class StockMovementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: '12.500',
    description: 'Quantidade positiva com até três casas decimais.',
  })
  @Transform(decimalString)
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/)
  quantity: string;

  @ApiProperty({ minLength: 2, maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({
    enum: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'],
    description: 'Obrigatório somente em POST /stock/adjustments.',
  })
  @IsOptional()
  @IsIn(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'])
  movementType?: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';

  @ApiPropertyOptional({
    maxLength: 150,
    description: 'Chave de idempotência da movimentação.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  idempotencyKey?: string;
}

export class CorrectStockMovementDto {
  @ApiProperty({
    description: 'Justificativa para o movimento compensatório.',
    minLength: 2,
    maxLength: 1000,
  })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  reason: string;
}

export class StockMovementQueryDto {
  @ApiPropertyOptional({
    enum: [
      'ENTRY',
      'EXIT',
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'RESERVATION',
      'RELEASE',
    ],
  })
  @IsOptional()
  @IsIn([
    'ENTRY',
    'EXIT',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'RESERVATION',
    'RELEASE',
  ])
  type?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class StockBalanceResponseDto {
  @ApiPropertyOptional({ format: 'uuid' })
  id?: string;

  @ApiProperty({ format: 'uuid' })
  productId: string;

  @ApiProperty({
    example: '120.000',
    description: 'Saldo físico serializado como string.',
  })
  quantityOnHand: string;

  @ApiProperty({ example: '12.500' })
  quantityReserved: string;

  @ApiPropertyOptional({
    example: '107.500',
    description: 'Disponível = físico - reservado.',
  })
  quantityAvailable?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: string;
}

export class StockMovementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  productId: string;

  @ApiProperty({
    enum: [
      'ENTRY',
      'EXIT',
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'RESERVATION',
      'RELEASE',
    ],
  })
  movementType: string;

  @ApiProperty({ example: '2.500' })
  quantity: string;

  @ApiProperty({ example: '20.000' })
  quantityBefore: string;

  @ApiProperty({ example: '22.500' })
  quantityAfter: string;

  @ApiProperty({ example: '5.000' })
  reservedBefore: string;

  @ApiProperty({ example: '5.000' })
  reservedAfter: string;

  @ApiProperty({ example: 'Recebimento de mercadoria' })
  reason: string;

  @ApiPropertyOptional({ nullable: true })
  referenceType: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  referenceId: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  performedByUserId: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class StockBalancesPageResponseDto extends PageMetadataResponseDto {
  @ApiProperty({ type: [StockBalanceResponseDto] })
  items: StockBalanceResponseDto[];
}

export class StockMovementsPageResponseDto extends PageMetadataResponseDto {
  @ApiProperty({ type: [StockMovementResponseDto] })
  items: StockMovementResponseDto[];
}
