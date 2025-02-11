import { MigrationService } from './migration.service';
import { MigrationDto } from './dto/migration.dto';
export declare class MigrationController {
    private readonly migrationService;
    constructor(migrationService: MigrationService);
    runMigration(): Promise<{
        msg: import("./constants/status").StatusOptions;
    }>;
    runSpecificMigration(migrationDto: MigrationDto): Promise<{
        msg: import("./constants/status").StatusOptions;
        description: string;
    }>;
    revertMigration(migrationDto: MigrationDto): Promise<{
        msg: import("./constants/status").StatusOptions;
        description: string;
    }>;
}
