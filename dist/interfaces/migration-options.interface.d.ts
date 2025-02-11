import { ModuleMetadata } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
export interface RedshiftConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}
export interface AWSConfig {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
}
export interface MigrationModuleOptions {
    typeormConfig: TypeOrmModuleOptions;
    migrationFolderName?: string;
    migration_dir_key_prefix?: string;
    isGlobal?: boolean;
    runOnStartUp?: boolean;
    useS3?: boolean;
    s3ModuleOptions?: {
        awsS3Accesskey: string;
        awsS3SecretKey: string;
        awsS3Region: string;
        awsS3Bucket: string;
    };
}
export interface MigrationModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    isGlobal?: boolean;
    useFactory: (...args: any[]) => Promise<MigrationModuleOptions> | MigrationModuleOptions;
    inject?: any[];
}
export interface MigrationExistingConnectionOptions extends Omit<MigrationModuleOptions, 'typeormConfig'> {
    connectionName: string;
}
