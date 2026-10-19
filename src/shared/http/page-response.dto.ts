import { ApiProperty } from '@nestjs/swagger';

export class PageMetadataResponseDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  limit: number;

  @ApiProperty({ example: 120 })
  total: number;
}
