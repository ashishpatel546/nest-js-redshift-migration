
/**
 * Base configuration options for the Migration module
 */
export interface MigrationModuleOptions {
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

/**
 * Configuration options for existing connection in the Migration module
 */
export interface MigrationExistingConnectionOptions
  extends MigrationModuleOptions {
  connectionName: string;
}
