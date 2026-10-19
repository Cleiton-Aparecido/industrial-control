import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageMetadataResponseDto } from 'src/shared/http/page-response.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const decimalString = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : value;

export class CreateProductDto {
  @ApiProperty({ example: 'Sementes de milho', maxLength: 180 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'MILHO-001', maxLength: 80 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiProperty({ example: 'saco', maxLength: 40 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  unit: string;

  @ApiProperty({ example: '25.50', description: 'Preço unitário.' })
  @Transform(decimalString)
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  price: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({
    example: '27.00',
    description: 'Novo preço unitário.',
  })
  @IsOptional()
  @Transform(decimalString)
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  price?: string;
}

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Sementes de milho' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiPropertyOptional({ example: 'MILHO-001', nullable: true })
  sku: string | null;

  @ApiProperty({ example: 'saco' })
  unit: string;

  @ApiProperty({ example: '25.50' })
  price: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class ProductsPageResponseDto extends PageMetadataResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  items: ProductResponseDto[];
}
