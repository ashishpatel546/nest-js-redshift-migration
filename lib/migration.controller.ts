import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MigrationService } from './migration.service';
import { MigrationDto } from './dto/migration.dto';

@ApiTags('Database Migrations')
@Controller('migrations')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run all pending migrations' })
  @ApiResponse({ status: 200, description: 'Migrations executed successfully' })
  async runMigration() {
    return this.migrationService.triggerMigration();
  }

  @Post('run-specific')
  @ApiOperation({ summary: 'Run a specific migration' })
  @ApiResponse({ status: 200, description: 'Migration executed successfully' })
  async runSpecificMigration(@Body() migrationDto: MigrationDto) {
    return this.migrationService.runSpecificMigration(migrationDto);
  }

  @Post('revert')
  @ApiOperation({ summary: 'Revert a specific migration' })
  @ApiResponse({ status: 200, description: 'Migration reverted successfully' })
  async revertMigration(@Body() migrationDto: MigrationDto) {
    return this.migrationService.revertSpecificMigration(migrationDto);
  }
}
