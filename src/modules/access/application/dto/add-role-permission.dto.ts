import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddRolePermissionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all')
  permissionId: string;
}
