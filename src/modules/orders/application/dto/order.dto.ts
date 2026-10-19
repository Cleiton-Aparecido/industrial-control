import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PageMetadataResponseDto } from 'src/shared/http/page-response.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const decimalString = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : value;

export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: '2.000',
    description: 'Quantidade positiva com até três casas decimais.',
  })
  @Transform(decimalString)
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/)
  quantity: string;

  @ApiPropertyOptional({
    example: '24.90',
    description:
      'Preço unitário negociado; quando omitido, usa o preço atual do produto.',
  })
  @IsOptional()
  @Transform(decimalString)
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  unitPrice?: string;
}

export class CreateOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: [CreateOrderItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  customerNotes?: string;

  @ApiPropertyOptional({
    type: Object,
    example: { street: 'Rua A', city: 'Goiânia', state: 'GO' },
  })
  @IsOptional()
  @IsObject()
  deliveryAddressSnapshot?: Record<string, string>;
}

export class OrderTransitionDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  productId: string;

  @ApiProperty({ example: 'Sementes de milho' })
  productNameSnapshot: string;

  @ApiPropertyOptional({ nullable: true })
  productSkuSnapshot: string | null;

  @ApiProperty({ example: 'saco' })
  unitSnapshot: string;

  @ApiProperty({ example: '2.000' })
  quantity: string;

  @ApiProperty({ example: '24.90' })
  unitPriceSnapshot: string;

  @ApiProperty({ example: '49.80' })
  lineTotal: string;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty({ format: 'uuid' })
  createdByUserId: string;

  @ApiProperty({
    enum: [
      'PENDING',
      'PROCESSING',
      'READY_FOR_SHIPMENT',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED',
    ],
  })
  status: string;

  @ApiProperty({ example: 'Maria da Silva' })
  customerNameSnapshot: string;

  @ApiProperty({ example: '52998224725' })
  customerDocumentSnapshot: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  deliveryAddressSnapshot: Record<string, string> | null;

  @ApiPropertyOptional({ nullable: true })
  customerNotes: string | null;

  @ApiPropertyOptional({ nullable: true })
  internalNotes: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ example: '49.80' })
  totalAmount: string;

  @ApiProperty({ format: 'date-time' })
  submittedAt: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class OrderStatusHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  orderId: string;

  @ApiPropertyOptional({ nullable: true })
  previousStatus: string | null;

  @ApiProperty({ example: 'PENDING' })
  newStatus: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  changedByUserId: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class OrdersPageResponseDto extends PageMetadataResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items: OrderResponseDto[];
}
