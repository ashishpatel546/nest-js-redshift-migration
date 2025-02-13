"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MigrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const conection_name_1 = require("./constants/conection-name");
const status_1 = require("./constants/status");
const nest_js_aws_s3_1 = require("@sologence/nest-js-aws-s3");
const moment_1 = __importDefault(require("moment"));
let MigrationService = MigrationService_1 = class MigrationService {
    constructor(options, dataSource) {
        this.options = options;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(MigrationService_1.name);
        this.migration_dir_key_prefix = this.options.migration_dir_key_prefix;
        this.uploadPath = `MigrationFile`;
        this.migrationFolderName = this.options.migrationFolderName;
        this.migrationDirKey = `${this.migration_dir_key_prefix}_${this.migrationFolderName}`;
        if (options.useS3 && options.s3ModuleOptions) {
            this.logger.debug('Using AWS S3 to upload the migration files');
            this.logger.debug('Initializing S3 client for Migration service');
            this.s3 = new nest_js_aws_s3_1.S3Service(options.s3ModuleOptions);
        }
    }
    async createMigrationTableIfNotExists() {
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
    getQueryRunner() {
        return this.dataSource.createQueryRunner();
    }
    async getLastSuccessfullMigrationRecord(dirName) {
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
        }
        catch (error) {
            this.logger.warn('Error getting last migration timestamp:', error.message);
            return null;
        }
    }
    async readMigrationFile(migrationFolderName) {
        const cwd = process.cwd();
        const filePath = path_1.default.join(cwd, 'src', migrationFolderName);
        if (!this.checkDirectoryExist(filePath)) {
            this.logger.error(`Migration folder not found at path: ${filePath}`);
            return null;
        }
        const lastTimestamp = await this.getLastSuccessfullMigrationRecord(migrationFolderName).then((res) => { var _a; return (_a = res === null || res === void 0 ? void 0 : res.timestamp) !== null && _a !== void 0 ? _a : 0; });
        const migrationFiles = await (0, promises_1.readdir)(filePath);
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
    async updateMigrationHistory(migrationDir, fileName, timestamp) {
        const migrationDirKey = `${this.migration_dir_key_prefix}_${migrationDir}`;
        try {
            const newEntry = {
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
                msg: status_1.StatusOptions.SUCCESS,
            };
        }
        catch (error) {
            this.logger.error(error.message);
            return {
                msg: status_1.StatusOptions.FAIL,
            };
        }
    }
    async uploadMigraionFileOnS3(file, absFilePath) {
        const uploadKey = `${this.uploadPath}/${file}`;
        const uploadRes = await this.s3.uploadfileInCsv(uploadKey, absFilePath);
        if (uploadRes.$metadata.httpStatusCode === 200) {
            this.logger.log(`${file} uploaded successfully to s3 on ${uploadKey}`);
            return {
                msg: status_1.StatusOptions.SUCCESS,
            };
        }
        else {
            return {
                msg: status_1.StatusOptions.FAIL,
            };
        }
    }
    async assureMigrationTrackingExist() {
        try {
            await this.createMigrationTableIfNotExists();
        }
        catch (error) {
            this.logger.log(error.message);
            return null;
        }
    }
    checkSrcFolderExistsInDist() {
        try {
            const cwd = process.cwd();
            const distSrcPath = path_1.default.join(cwd, 'dist', 'src');
            const isExist = fs_1.default.existsSync(distSrcPath);
            this.logger.debug(`Src folder in dist exist: ${isExist}`);
            return isExist;
        }
        catch (error) {
            this.logger.error('Error checking src folder in dist:', error.message);
            return false;
        }
    }
    getMigrationFolderPath(migFolderName) {
        let cwd = process.cwd();
        this.logger.debug(`Current working directory: ${cwd}`);
        try {
            let distFolderPath = path_1.default.join(cwd, 'dist');
            const needToAddSrcPath = this.checkSrcFolderExistsInDist();
            if (needToAddSrcPath) {
                distFolderPath = path_1.default.join(distFolderPath, 'src');
            }
            this.logger.debug(`dist folder path: ${distFolderPath}`);
            const jsFolderPath = distFolderPath.includes(migFolderName)
                ? distFolderPath
                : path_1.default.join(distFolderPath, migFolderName);
            this.logger.debug(`Migration folder path for js files: ${jsFolderPath}`);
            const tsFolderPath = jsFolderPath
                .replace('js', 'ts')
                .replace('/dist', '');
            this.logger.debug(`Migration foler path for ts files : ${tsFolderPath}`);
            return {
                jsFolderPath,
                tsFolderPath,
            };
        }
        catch (error) {
            this.logger.error('Error getting file paths:', error.message);
            return {
                jsFolderPath: null,
                tsFolderPath: null,
            };
        }
    }
    async runMigration(migrationFiles, migrationFolderName) {
        if (!migrationFiles || migrationFiles.length === 0) {
            this.logger.log(`No migration to run at ${(0, moment_1.default)().format('YYYY-MM-DD HH:mm:ss')}`);
            return;
        }
        const queryRunner = this.getQueryRunner();
        const { jsFolderPath, tsFolderPath } = this.getMigrationFolderPath(migrationFolderName);
        if (!jsFolderPath || !tsFolderPath) {
            this.logger.error(`Migration file not found in folder: ${migrationFolderName}`);
            return;
        }
        await this.assureMigrationTrackingExist();
        try {
            for (const migration of migrationFiles) {
                const timestamp = parseInt(migration.split('-')[0], 10);
                const className = `Migration${timestamp}`;
                const jsMigrationFilePath = path_1.default.join(jsFolderPath, migration.replace('ts', 'js'));
                const tsMigrationFilePath = path_1.default.join(tsFolderPath, migration);
                this.logger.log(`Attempting to import migration from: ${tsMigrationFilePath}`);
                try {
                    const migrationModule = require(jsMigrationFilePath);
                    const MigrationClass = migrationModule[className];
                    if (MigrationClass && typeof MigrationClass === 'function') {
                        const migrationInstance = new MigrationClass();
                        if (typeof migrationInstance.up === 'function') {
                            await migrationInstance.up(queryRunner);
                            this.logger.log(`Successfully ran migration: ${className}`);
                            const dbRes = await this.updateMigrationHistory(migrationFolderName, migration, timestamp);
                            if (dbRes.msg === status_1.StatusOptions.SUCCESS) {
                                if (this.options.useS3) {
                                    const status = await this.uploadMigraionFileOnS3(migration, tsMigrationFilePath);
                                    if (status.msg === status_1.StatusOptions.SUCCESS) {
                                        this.logger.log(`File uploaded to S3.`);
                                    }
                                    else {
                                        this.logger.warn(`Unable to upload file to s3.`);
                                    }
                                }
                            }
                            else {
                                this.logger.warn(`Unable to update migration track.`);
                            }
                        }
                        else {
                            this.logger.warn(`Migration ${className} does not have an 'up' method`);
                        }
                    }
                    else {
                        this.logger.warn(`Could not find class ${className} in ${migration}`);
                    }
                }
                catch (error) {
                    this.logger.error(error.message);
                    this.logger.error(`Failed to run migration ${className}`);
                }
            }
        }
        catch (error) {
            this.logger.error(error.message);
        }
    }
    checkDirectoryExist(directory) {
        try {
            return fs_1.default.existsSync(directory);
        }
        catch (err) {
            return false;
        }
    }
    async triggerMigration() {
        const migrationFolderName = this.migrationFolderName;
        const migrationFiles = await this.readMigrationFile(migrationFolderName);
        await this.runMigration(migrationFiles, this.migrationFolderName);
        return {
            msg: status_1.StatusOptions.SUCCESS,
        };
    }
    checkFileExists(filePath) {
        try {
            return fs_1.default.existsSync(filePath);
        }
        catch (err) {
            return false;
        }
    }
    async runRevertMigraion(migration, migrationFolder) {
        if (!migration || migration.length === 0) {
            this.logger.log(`No migration file name to run revert migraion`);
            return;
        }
        const queryRunner = this.dataSource.createQueryRunner();
        let currentQueryRunner = queryRunner;
        const { jsFolderPath, tsFolderPath } = this.getMigrationFolderPath(migrationFolder);
        if (!jsFolderPath || !tsFolderPath) {
            this.logger.error(`Migration file not found in folder: ${migrationFolder}`);
            return;
        }
        const timestamp = parseInt(migration.split('-')[0], 10);
        const className = `Migration${timestamp}`;
        try {
            let jsMigrationFilePath = path_1.default.join(jsFolderPath, migration.replace('ts', 'js'));
            let tsMigrationFilePath = path_1.default.join(tsFolderPath, migration);
            const isFileExist = this.checkFileExists(jsMigrationFilePath);
            if (!isFileExist) {
                this.logger.error(`Migration file not found in folder: ${migrationFolder}, path: ${jsMigrationFilePath}`);
                return;
            }
            this.logger.log(`Attempting to import migration from: ${tsMigrationFilePath}`);
            const migrationModule = require(jsMigrationFilePath);
            const MigrationClass = migrationModule[className];
            if (MigrationClass && typeof MigrationClass === 'function') {
                const migrationInstance = new MigrationClass();
                if (typeof migrationInstance.up === 'function') {
                    await migrationInstance.down(currentQueryRunner);
                    this.logger.log(`Successfully reverted migration: ${className}`);
                    const migDirKey = `${this.migration_dir_key_prefix}_${migrationFolder}`;
                    const dbRes = await this.deleteFromMigrationHistory(migration, migDirKey);
                    if ((dbRes === null || dbRes === void 0 ? void 0 : dbRes.msg) === status_1.StatusOptions.SUCCESS)
                        this.logger.log(`Migration track record deleted successfully`);
                    else
                        this.logger.error(`Unable to delete record from migration track.`);
                }
                else {
                    this.logger.warn(`Migration ${className} does not have an 'down' method`);
                }
            }
        }
        catch (error) {
            this.logger.error(error.message);
            this.logger.error(`Failed to revert migration ${className}`);
        }
    }
    async deleteFromMigrationHistory(migraion, migDirKey) {
        if (!migraion || migraion.length === 0) {
            this.logger.log(`No migration file name found to delete from migration track.`);
            return;
        }
        this.logger.log(`Deleting record from migration tracking for migration name: ${migraion}`);
        const query = `DELETE FROM migration_history WHERE migration_file_name = $1 AND migration_dir_key = $2;`;
        const params = [migraion, migDirKey];
        try {
            await this.dataSource.query(query, params);
            this.logger.log(`Migration tracking updated successfully, record deleted for migration: ${migraion}`);
            return {
                msg: status_1.StatusOptions.SUCCESS,
            };
        }
        catch (error) {
            this.logger.error(error.message);
            this.logger.error(`Unable to delete migration record from migration tracking for migration: ${migraion}`);
            return {
                msg: status_1.StatusOptions.FAIL,
            };
        }
    }
    async revertMigrationFile(filename) {
        const migrationFolder = this.migrationFolderName;
        this.runRevertMigraion(filename, migrationFolder).then(() => {
            this.logger.log(`Revert migration done for ${filename}`);
        });
        return {
            msg: status_1.StatusOptions.SUCCESS,
            description: 'Request recieved. check logs for more details.',
        };
    }
    async runSpecificMigration(migrationDto) {
        const { migration_file_name, migration_folder_name } = migrationDto;
        if (!migration_file_name) {
            throw new Error('Migration file name is required');
        }
        const migrationFiles = [migration_file_name];
        await this.runMigration(migrationFiles, migration_folder_name);
        return {
            msg: status_1.StatusOptions.SUCCESS,
            description: `Migration ${migration_file_name} executed successfully`,
        };
    }
    async revertSpecificMigration(migrationDto) {
        const { migration_file_name, migration_folder_name } = migrationDto;
        if (!migration_file_name) {
            throw new Error('Migration file name is required');
        }
        const migrationFolder = migration_folder_name || this.migrationFolderName;
        await this.runRevertMigraion(migration_file_name, migrationFolder);
        return {
            msg: status_1.StatusOptions.SUCCESS,
            description: `Migration ${migration_file_name} reverted successfully`,
        };
    }
    async onModuleInit() {
        if (this.options.runOnStartUp !== true) {
            this.logger.log(`Migration run on startup is disabled.`);
            return;
        }
        this.logger.warn(`Running pending migrations`);
        this.triggerMigration()
            .then(() => this.logger.warn(`All pending migrations done and migration tracking updated successfully`))
            .catch((err) => this.logger.error(err));
    }
};
MigrationService = MigrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('MIGRATION_OPTIONS')),
    __param(1, (0, common_1.Inject)(conection_name_1.REDSHIFT_DATASOURCE)),
    __metadata("design:paramtypes", [Object, typeorm_1.DataSource])
], MigrationService);
exports.MigrationService = MigrationService;
//# sourceMappingURL=migration.service.js.map