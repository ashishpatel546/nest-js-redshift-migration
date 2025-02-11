import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MigrationDto {
  @ApiProperty({
    description: 'Name of the migration file',
    example: '1738657155856-migration.ts',
  })
  @IsString()
  @IsNotEmpty()
  migration_file_name: string;

  @ApiProperty({
    description: 'Migration foler name',
    example: 'migrations',
  })
  @IsString()
  @IsNotEmpty()
  migration_folder_name: string;
}
