import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MigrationModuleOptions } from './interfaces/migration-options.interface';
import { StatusOptions } from './constants/status';
import { MigrationDto } from './dto/migration.dto';
export declare class MigrationService implements OnModuleInit {
    private readonly options;
    private readonly dataSource;
    private logger;
    private readonly migration_dir_key_prefix;
    private readonly uploadPath;
    private readonly migrationFolderName;
    private s3;
    private readonly migrationDirKey;
    constructor(options: MigrationModuleOptions, dataSource: DataSource);
    private createMigrationTableIfNotExists;
    private getQueryRunner;
    private getLastSuccessfullMigrationRecord;
    private readMigrationFile;
    private updateMigrationHistory;
    private uploadMigraionFileOnS3;
    private assureMigrationTrackingExist;
    private checkSrcFolderExistsInDist;
    private getFilePaths;
    private runMigration;
    private checkDirectoryExist;
    triggerMigration(): Promise<{
        msg: StatusOptions;
    }>;
    private checkFileExists;
    private runRevertMigraion;
    private deleteFromMigrationHistory;
    revertMigrationFile(filename: string): Promise<{
        msg: StatusOptions;
        description: string;
    }>;
    runSpecificMigration(migrationDto: MigrationDto): Promise<{
        msg: StatusOptions;
        description: string;
    }>;
    revertSpecificMigration(migrationDto: MigrationDto): Promise<{
        msg: StatusOptions;
        description: string;
    }>;
    onModuleInit(): Promise<void>;
}
