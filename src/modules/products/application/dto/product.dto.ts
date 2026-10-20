import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PageMetadataResponseDto } from 'src/shared/http/page-response.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const decimalString = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : value;

export class CreateProductImageDto {
  @ApiProperty({
    description: 'Imagem em Data URL Base64 ou Base64 puro.',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
  })
  @IsString()
  base64: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;
}

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

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
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

  @ApiProperty({ type: () => [ProductImageResponseDto] })
  images: ProductImageResponseDto[];
}

export class ProductImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uri' })
  url: string;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  contentType: string;
}

export class ProductsPageResponseDto extends PageMetadataResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  items: ProductResponseDto[];
}
