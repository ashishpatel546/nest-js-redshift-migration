# NestJS Redshift Migration Support Module

A robust migration module for NestJS applications using Amazon Redshift, with built-in support for S3 backup and version tracking.

> **Why this package?** Amazon Redshift doesn't natively support database migrations like traditional databases. This package fills that gap by providing a reliable, automated way to manage schema changes and data migrations in Redshift while maintaining version control and rollback capabilities. Currently we support if migration file already exists with you. Later on we'll support autonomous creation of migration files.

[![npm version](https://badge.fury.io/js/@sologence%2Fnestjs-redshift-migration.svg)](https://badge.fury.io/js/@sologence%2Fnestjs-redshift-migration)

## Key Benefits

- 🔄 Handles Redshift's migration limitations
- 📝 Tracks migration history in Redshift
- 🔒 Safe, versioned schema changes
- 🔙 Supports rollback operations
- 📦 Automatic S3 backups of migration files
- 🤖 CI/CD friendly

## Features

- 🚀 Automated database migrations
- 📦 S3 backup integration
- 🔄 Version tracking
- ⏪ Migration rollback support
- 🐳 Docker compatibility
- 🔄 Async configuration support

## Installation

```bash
npm install @sologence/nestjs-redshift-migration
```

## Quick Start

### 1. Module Configuration

This module is designed to work with your existing TypeORM connection. It provides two ways to register the module:

```typescript
import { MigrationModule } from '@sologence/nestjs-redshift-migration';

// Using static configuration
@Module({
  imports: [
    MigrationModule.forExistingConnection({
      connectionName: 'your-connection-name', // Your existing TypeORM connection name
      migrationFolderName: 'migrations',
      migration_dir_key_prefix: 'your-prefix',
      useS3: true,
      s3ModuleOptions: {
        awsS3Accesskey: 'your-access-key',
        awsS3SecretKey: 'your-secret-key',
        awsS3Region: 'your-region',
        awsS3Bucket: 'your-bucket',
      },
      runOnStartUp: true,
      isGlobal: true, // optional
    }),
  ],
})
export class AppModule {}

// Using async configuration
MigrationModule.forExistingConnectionAsync({
  imports: [ConfigModule],
  connectionName: 'your-connection-name',
  useFactory: async (configService: ConfigService) => ({
    migrationFolderName: configService.get('MIGRATION_FOLDER'),
    migration_dir_key_prefix: configService.get('MIGRATION_PREFIX'),
    useS3: true,
    s3ModuleOptions: {
      awsS3Accesskey: configService.get('AWS_S3_ACCESS_KEY'),
      awsS3SecretKey: configService.get('AWS_S3_SECRET_KEY'),
      awsS3Region: configService.get('AWS_S3_REGION'),
      awsS3Bucket: configService.get('AWS_S3_BUCKET'),
    },
    runOnStartUp: true,
    isGlobal: true, // optional
  }),
  inject: [ConfigService],
});
```

## Configuration Options

| Option                   | Type            | Description                                                                    |
| ------------------------ | --------------- | ------------------------------------------------------------------------------ |
| connectionName           | string          | Required. Name of your existing TypeORM connection                             |
| migrationFolderName      | string          | Optional. Name of the folder containing migration files                        |
| migration_dir_key_prefix | string          | Optional. Prefix for migration directory keys                                  |
| useS3                    | boolean         | Optional. Enable/disable S3 backup                                             |
| s3ModuleOptions          | S3ModuleOptions | Optional. AWS S3 configuration with access key, secret key, region, and bucket |
| runOnStartUp             | boolean         | Optional. Auto-run migrations on startup                                       |
| isGlobal                 | boolean         | Optional. Make the module global                                               |

### 2. Creating Migrations

You can create migration files in your project's `src/migrations` folder. Each migration file should follow this structure:

```typescript
export class Migration1677581234 {
  async up(queryRunner) {
    // Add your migration code here
    await queryRunner.query(`
      CREATE TABLE example (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255)
      );
    `);
  }

  async down(queryRunner) {
    // Add your rollback code here
    await queryRunner.query('DROP TABLE example;');
  }
}
```

Optional: You can add this script to your project's package.json to help create migration files:

```json
{
  "scripts": {
    "mg:create": "typeorm-ts-node-commonjs migration:create ./src/migrations/migration"
  }
}
```

Then use: `npm run mg:create` to generate a new migration file.

## How It Works

1. **Automatic Table Creation**: The module automatically creates a `migration_history` table in your database to track migrations:

```sql
CREATE TABLE IF NOT EXISTS migration_history (
  id INT IDENTITY(1,1) PRIMARY KEY,
  migration_file_name VARCHAR(255),
  migration_dir_key VARCHAR(255),
  created_on TIMESTAMP,
  timestamp BIGINT
);
```

2. **Migration Process**:

   - When the application starts (if `runOnStartUp: true`) or when triggered manually:
     1. Checks for the existence of migration_history table
     2. Creates it if doesn't exist
     3. Reads all migration files from your specified migrations folder
     4. Compares timestamps with last executed migration
     5. Runs pending migrations in chronological order

3. **Version Control**:

   - Each migration is tracked by its timestamp
   - Files are executed in order based on their timestamp prefix
   - Successfully executed migrations are recorded in migration_history
   - Prevents duplicate execution of migrations

4. **S3 Backup** (when enabled):

   - After successful migration execution
   - Automatically uploads migration files to specified S3 bucket
   - Uses the configured AWS credentials
   - Maintains backup copy for disaster recovery

5. **Rollback Support**:
   - Each migration can define both `up()` and `down()` methods
   - `down()` method contains the rollback logic
   - Can revert specific migrations when needed
   - Automatically updates migration_history after rollback

## API Endpoints

When you enable the API by setting `exposeApi: true` in your module configuration, the following endpoints become available:

### Available Endpoints

| Method | Endpoint                 | Description                | Request Body |
| ------ | ------------------------ | -------------------------- | ------------ |
| POST   | /migrations/run          | Run all pending migrations | None         |
| POST   | /migrations/run-specific | Run a specific migration   | ```json      |

{
"migration_file_name": "1738657155856-migration.ts",
"migration_folder_name": "migrations"
}

````|
| POST   | /migrations/revert | Revert a specific migration | ```json
{
  "migration_file_name": "1738657155856-migration.ts",
  "migration_folder_name": "migrations"
}
``` |

To enable the API endpoints, update your module configuration:

```typescript
MigrationModule.forExistingConnection({
  // ...other options...
  exposeApi: true, // Enable API endpoints
});

// Or for async configuration
MigrationModule.forExistingConnectionAsync({
  // ...other options...
  exposeApi: true, // Enable API endpoints
});
````

### Swagger Documentation

The API endpoints are automatically documented using Swagger. Access the Swagger UI at `/api` when your application is running to test the endpoints interactively.

// ...rest of existing code...
