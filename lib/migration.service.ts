import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, Not, QueryRunner } from 'typeorm';
import fs from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import { MigrationModuleOptions } from './interfaces/migration-options.interface';
import { MigrationHistory } from './migrations.entity';
import { REDSHIFT_DATASOURCE } from './constants/conection-name';
import { StatusOptions } from './constants/status';
import { S3Service } from '@sologence/nest-js-aws-s3';
import moment from 'moment';
import { MigrationDto } from './dto/migration.dto';

/**
 * Service responsible for handling database migrations
 */
@Injectable()
export class MigrationService implements OnModuleInit {
  private logger = new Logger(MigrationService.name);
  private readonly migration_dir_key_prefix =
    this.options.migration_dir_key_prefix;
  private readonly uploadPath = `MigrationFile`;
  private readonly migrationFolderName = this.options.migrationFolderName;
  private s3: S3Service;
  private readonly migrationDirKey = `${this.migration_dir_key_prefix}_${this.migrationFolderName}`;

  constructor(
    @Inject('MIGRATION_OPTIONS')
    private readonly options: MigrationModuleOptions,
    @Inject(REDSHIFT_DATASOURCE)
    private readonly dataSource: DataSource
  ) {
    if (options.useS3 && options.s3ModuleOptions) {
      this.logger.debug('Using AWS S3 to upload the migration files');
      this.logger.debug('Initializing S3 client for Migration service');
      this.s3 = new S3Service(options.s3ModuleOptions);
    }
  }

  /**
   * Creates the migration history table if it doesn't exist
   * @returns Promise<void>
   */
  private async createMigrationTableIfNotExists(): Promise<void> {
    this.logger.log('Creating migration history table if not exists');
    const query = `
      CREATE TABLE IF NOT EXISTS migration_history (
        id INT IDENTITY(1,1) PRIMARY KEY,
        migration_file_name VARCHAR(255),
        migration_dir_key VARCHAR(255),
        created_on TIMESTAMP,
        timestamp BIGINT
      );`;
    const dbres = await this.dataSource.query(query);
    return;
  }

  private getQueryRunner(): QueryRunner {
    return this.dataSource.createQueryRunner();
  }

  /**
   * Gets the last successful migration record for a directory
   * @param dirName - Directory name to check
   * @returns Promise<MigrationHistory>
   */
  private async getLastSuccessfullMigrationRecord(
    dirName: string
  ): Promise<MigrationHistory> {
    const migrationDirKey = `${this.migration_dir_key_prefix}_${dirName}`;
    try {
      const query = `
      SELECT timestamp 
      FROM migration_history 
      WHERE migration_dir_key = $1 
      ORDER BY timestamp DESC 
      LIMIT 1`;

      const lastMigration = await this.dataSource.query(query, [
        migrationDirKey,
      ]);
      return lastMigration[0];
    } catch (error) {
      this.logger.warn(
        'Error getting last migration timestamp:',
        error.message
      );
      return null;
    }
  }

  /**
   * Reads migration files from the specified folder
   * @param migrationFolderName - Name of the migration folder
   * @returns Promise<string[]> Array of migration file names
   */
  private async readMigrationFile(migrationFolderName: string) {
    const cwd = path.resolve(process.cwd());
    const filePath = path
      .join(cwd, 'src', migrationFolderName)
      .replace('/dist', '');

    if (!this.checkDirectoryExist(filePath)) {
      this.logger.error(`Migration folder not found at path: ${filePath}`);
      return null; // skip this folder
    }

    const lastTimestamp = await this.getLastSuccessfullMigrationRecord(
      migrationFolderName
    ).then((res) => res?.timestamp ?? 0);
    const migrationFiles = await readdir(filePath);

    // Filter and sort files by timestamp
    const sortedFiles = migrationFiles
      .filter((file) => {
        const timestamp = parseInt(file.split('-')[0], 10);
        return timestamp > lastTimestamp;
      })
      .sort((a, b) => {
        const timestampA = parseInt(a.split('-')[0], 10);
        const timestampB = parseInt(b.split('-')[0], 10);
        return timestampA - timestampB;
      });

    return sortedFiles;
  }

  //todo: migrationDir need to take from class variable
  /**
   * Updates the migration history after successful migration
   * @param migrationDir - Migration directory name
   * @param fileName - Migration file name
   * @param timestamp - Migration timestamp
   */
  private async updateMigrationHistory(
    migrationDir: string,
    fileName: string,
    timestamp: number
  ) {
    const migrationDirKey = `${this.migration_dir_key_prefix}_${migrationDir}`;
    try {
      //code comented to remove the id from migration history table
      // const maxId = await this.dataSource
      //   .createQueryBuilder()
      //   .select('MAX(id)', 'max')
      //   .from('migration_history', 'mh')
      //   .where('mh.migration_dir_key = :migrationDir', { migrationDir })
      //   .getRawOne()
      //   .then(result => result.max);
      // const newId = maxId ? parseInt(maxId) + 1 : 1;

      const newEntry: MigrationHistory = {
        // id: newId,
        created_on: new Date(),
        migration_file_name: fileName,
        timestamp: timestamp,
        migration_dir_key: migrationDirKey,
      };
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('migration_history')
        .values(newEntry)
        .execute();

      this.logger.log(`Migration track updated successfully for ${fileName}`);
      return {
        msg: StatusOptions.SUCCESS,
      };
    } catch (error) {
      this.logger.error(error.message);
      return {
        msg: StatusOptions.FAIL,
      };
    }
  }

  /**
   * Uploads migration file to S3
   * @param file - File name
   * @param absFilePath - Absolute file path
   */
  private async uploadMigraionFileOnS3(file: string, absFilePath: string) {
    const uploadKey = `${this.uploadPath}/${file}`;
    const uploadRes = await this.s3.uploadfileInCsv(uploadKey, absFilePath);
    if (uploadRes.$metadata.httpStatusCode === 200) {
      this.logger.log(`${file} uploaded successfully to s3 on ${uploadKey}`);
      return {
        msg: StatusOptions.SUCCESS,
      };
    } else {
      return {
        msg: StatusOptions.FAIL,
      };
    }
  }

  private async assureMigrationTrackingExist() {
    try {
      await this.createMigrationTableIfNotExists();
    } catch (error) {
      this.logger.log(error.message);
      return null;
    }
  }

  // need to write the function that will return true or false on the basis of condition that will check that in current working direcytory the dist folder contains src folder or not
  private checkSrcFolderExistsInDist(): boolean {
    try {
      const cwd = process.cwd();
      const distSrcPath = path.join(cwd, 'dist', 'src');
      const isExist = fs.existsSync(distSrcPath);
      this.logger.debug(`Src folder in dist exist: ${isExist}`);
      return isExist;
    } catch (error) {
      this.logger.error('Error checking src folder in dist:', error.message);
      return false;
    }
  }

  private getMigrationFolderPath(migFolderName: string) {
    const cwd = process.cwd();
    this.logger.debug(`Current working directory: ${cwd}`);
    try {
      let distFolderPath = path.join(cwd, 'dist');

      //! if nest js application is not dockerized then we need to replace js with ts as it handles the issue that inside docket it created files under dist folder in some cases, so we can handle is with isDockerized flag
      const needToAddSrcPath = this.checkSrcFolderExistsInDist();
      if (needToAddSrcPath) {
        distFolderPath = path.join(distFolderPath, 'src');
      }
      // const finaldistFolderPath = needToAddSrcPath
      //   ? path.join(distFolderPath, 'src')
      //   : distFolderPath;
      // distFolderPath = finaldistFolderPath;
      this.logger.debug(`dist folder path: ${distFolderPath}`);
      const jsFolderPath = path.join(distFolderPath, migFolderName);
      this.logger.debug(`Migration folder path for js files: ${jsFolderPath}`);
      const tsFolderPath = jsFolderPath
        .replace('js', 'ts')
        .replace('/dist', '');
      this.logger.debug(`Migration foler path for ts files : ${tsFolderPath}`);
      return {
        jsFolderPath,
        tsFolderPath,
      };
    } catch (error) {
      this.logger.error('Error getting file paths:', error.message);
      return {
        jsFolderPath: null,
        tsFolderPath: null,
      };
    }
  }

  private async runMigration(
    migrationFiles: string[],
    migrationFolderName: string
  ) {
    if (!migrationFiles || migrationFiles.length === 0) {
      this.logger.log(
        `No migration to run at ${moment().format('YYYY-MM-DD HH:mm:ss')}`
      );
      return;
    }

    const queryRunner = this.getQueryRunner();
    console.debug('Migration Folder Name:', migrationFolderName);
    const { jsFolderPath, tsFolderPath } =
      this.getMigrationFolderPath(migrationFolderName);
    if (!jsFolderPath || !tsFolderPath) {
      this.logger.error(
        `Migration file not found in folder: ${migrationFolderName}`
      );
      return;
    }
    await this.assureMigrationTrackingExist();
    try {
      for (const migration of migrationFiles) {
        const timestamp = parseInt(migration.split('-')[0], 10);
        const className = `Migration${timestamp}`;
        const jsMigrationFilePath = path.join(
          jsFolderPath,
          migration.replace('ts', 'js')
        );
        const tsMigrationFilePath = path.join(tsFolderPath, migration);
        this.logger.log(
          `Attempting to import migration from: ${tsMigrationFilePath}`
        );

        try {
          // Dynamically import the migration file
          const migrationModule = require(jsMigrationFilePath);
          const MigrationClass = migrationModule[className];

          if (MigrationClass && typeof MigrationClass === 'function') {
            const migrationInstance = new MigrationClass();

            if (typeof migrationInstance.up === 'function') {
              await migrationInstance.up(queryRunner);
              this.logger.log(`Successfully ran migration: ${className}`);

              const dbRes = await this.updateMigrationHistory(
                migrationFolderName,
                migration,
                timestamp
              );
              if (dbRes.msg === StatusOptions.SUCCESS) {
                if (this.options.useS3) {
                  const status = await this.uploadMigraionFileOnS3(
                    migration,
                    tsMigrationFilePath
                  );
                  if (status.msg === StatusOptions.SUCCESS) {
                    this.logger.log(`File uploaded to S3.`);
                  } else {
                    this.logger.warn(`Unable to upload file to s3.`);
                  }
                }
              } else {
                this.logger.warn(`Unable to update migration track.`);
              }
            } else {
              this.logger.warn(
                `Migration ${className} does not have an 'up' method`
              );
            }
          } else {
            this.logger.warn(
              `Could not find class ${className} in ${migration}`
            );
          }
        } catch (error) {
          this.logger.error(error.message);
          this.logger.error(`Failed to run migration ${className}`);
        }
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  private checkDirectoryExist(directory: string): boolean {
    try {
      return fs.existsSync(directory);
    } catch (err) {
      return false;
    }
  }

  /**
   * Triggers pending migrations
   * @returns Promise with status
   */
  async triggerMigration() {
    // for (const migrationFolder of this.migrationFolders) {
    const migrationFolderName = this.migrationFolderName;
    const migrationFiles = await this.readMigrationFile(migrationFolderName);
    await this.runMigration(migrationFiles, this.migrationFolderName);
    // }

    return {
      msg: StatusOptions.SUCCESS,
    };
  }

  private checkFileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch (err) {
      return false;
    }
  }

  private async runRevertMigraion(migration: string, migrationFolder: string) {
    if (!migration || migration.length === 0) {
      this.logger.log(`No migration file name to run revert migraion`);
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    let currentQueryRunner: QueryRunner = queryRunner;
    const { jsFolderPath, tsFolderPath } =
      this.getMigrationFolderPath(migrationFolder);
    if (!jsFolderPath || !tsFolderPath) {
      this.logger.error(
        `Migration file not found in folder: ${migrationFolder}`
      );
      return;
    }
    const timestamp = parseInt(migration.split('-')[0], 10);
    const className = `Migration${timestamp}`;
    try {
      let jsMigrationFilePath = path.join(
        jsFolderPath,
        migration.replace('ts', 'js')
      );
      let tsMigrationFilePath = path.join(tsFolderPath, migration);
      // Check if file exist at path
      const isFileExist = this.checkFileExists(jsMigrationFilePath);

      // if not exist then just return from here
      if (!isFileExist) {
        this.logger.error(
          `Migration file not found in folder: ${migrationFolder}, path: ${jsMigrationFilePath}`
        );
        return;
      }

      this.logger.log(
        `Attempting to import migration from: ${tsMigrationFilePath}`
      );
      // Dynamically import the migration file
      const migrationModule = require(jsMigrationFilePath);
      const MigrationClass = migrationModule[className];

      if (MigrationClass && typeof MigrationClass === 'function') {
        const migrationInstance = new MigrationClass();

        if (typeof migrationInstance.up === 'function') {
          await migrationInstance.down(currentQueryRunner);
          this.logger.log(`Successfully reverted migration: ${className}`);
          const migDirKey = `${this.migration_dir_key_prefix}_${migrationFolder}`;
          const dbRes = await this.deleteFromMigrationHistory(
            migration,
            migDirKey
          );
          if (dbRes?.msg === StatusOptions.SUCCESS)
            this.logger.log(`Migration track record deleted successfully`);
          else
            this.logger.error(`Unable to delete record from migration track.`);
        } else {
          this.logger.warn(
            `Migration ${className} does not have an 'down' method`
          );
        }
      }
    } catch (error) {
      this.logger.error(error.message);
      this.logger.error(`Failed to revert migration ${className}`);
    }
  }

  private async deleteFromMigrationHistory(
    migraion: string,
    migDirKey: string
  ) {
    if (!migraion || migraion.length === 0) {
      this.logger.log(
        `No migration file name found to delete from migration track.`
      );
      return;
    }
    this.logger.log(
      `Deleting record from migration tracking for migration name: ${migraion}`
    );
    // this.logger.log(`Checking for existance of migration_history`);
    // const isMigrationTrackingExist = await this.assureMigrationTrackingExist();
    // if (!isMigrationTrackingExist) {
    //   this.logger.log(`No Migration Tracking cube exist.`);
    //   return {
    //     msg: StatusOptions.FAIL,
    //   };
    // }

    const query = `DELETE FROM migration_history WHERE migration_file_name = $1 AND migration_dir_key = $2;`;
    const params = [migraion, migDirKey];
    try {
      await this.dataSource.query(query, params);
      this.logger.log(
        `Migration tracking updated successfully, record deleted for migration: ${migraion}`
      );
      return {
        msg: StatusOptions.SUCCESS,
      };
    } catch (error) {
      this.logger.error(error.message);
      this.logger.error(
        `Unable to delete migration record from migration tracking for migration: ${migraion}`
      );
      return {
        msg: StatusOptions.FAIL,
      };
    }
  }

  /**
   * Reverts a specific migration file
   * @param filename - Name of the migration file to revert
   * @returns Promise with status and description
   */
  async revertMigrationFile(filename: string) {
    const migrationFolder = this.migrationFolderName;
    this.runRevertMigraion(filename, migrationFolder).then(() => {
      this.logger.log(`Revert migration done for ${filename}`);
    });
    return {
      msg: StatusOptions.SUCCESS,
      description: 'Request recieved. check logs for more details.',
    };
  }

  async runSpecificMigration(migrationDto: MigrationDto) {
    const { migration_file_name, migration_folder_name } = migrationDto;
    if (!migration_file_name) {
      throw new Error('Migration file name is required');
    }

    const migrationFiles = [migration_file_name];

    await this.runMigration(migrationFiles, migration_folder_name);
    return {
      msg: StatusOptions.SUCCESS,
      description: `Migration ${migration_file_name} executed successfully`,
    };
  }

  async revertSpecificMigration(migrationDto: MigrationDto) {
    const { migration_file_name, migration_folder_name } = migrationDto;
    if (!migration_file_name) {
      throw new Error('Migration file name is required');
    }

    const migrationFolder = migration_folder_name || this.migrationFolderName;
    await this.runRevertMigraion(migration_file_name, migrationFolder);
    return {
      msg: StatusOptions.SUCCESS,
      description: `Migration ${migration_file_name} reverted successfully`,
    };
  }

  /**
   * Lifecycle hook that runs when module is initialized
   */
  async onModuleInit() {
    if (this.options.runOnStartUp !== true) {
      this.logger.log(`Migration run on startup is disabled.`);
      return;
    }
    this.logger.warn(`Running pending migrations`);
    this.triggerMigration()
      .then(() =>
        this.logger.warn(
          `All pending migrations done and migration tracking updated successfully`
        )
      )
      .catch((err) => this.logger.error(err));
  }
}
