import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageMetadataResponseDto } from 'src/shared/http/page-response.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCustomerDto {
  @ApiProperty({
    example: '123.456.789-09',
    description: 'CPF/CNPJ com ou sem pontuação.',
  })
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  documentNumber: string;

  @ApiProperty({ example: 'Maria da Silva', minLength: 2, maxLength: 180 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(180)
  tradeName?: string;

  @ApiPropertyOptional({
    type: Object,
    example: {
      street: 'Rua A',
      city: 'Goiânia',
      state: 'GO',
      postalCode: '74000-000',
    },
  })
  @IsOptional()
  @IsObject()
  address?: Record<string, string>;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 180 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(180)
  tradeName?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  address?: Record<string, string>;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class CustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['CPF', 'CNPJ'] })
  documentType: 'CPF' | 'CNPJ';

  @ApiProperty({ example: '52998224725' })
  documentNumber: string;

  @ApiProperty({ example: 'Maria da Silva' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  tradeName: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  address: Record<string, string> | null;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export class CustomerDocumentLookupResponseDto {
  @ApiProperty({ example: true })
  found: boolean;

  @ApiPropertyOptional({ type: CustomerResponseDto, nullable: true })
  customer: CustomerResponseDto | null;
}

export class CustomersPageResponseDto extends PageMetadataResponseDto {
  @ApiProperty({ type: [CustomerResponseDto] })
  items: CustomerResponseDto[];
}
