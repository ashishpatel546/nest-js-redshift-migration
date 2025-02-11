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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const migration_service_1 = require("./migration.service");
const migration_dto_1 = require("./dto/migration.dto");
let MigrationController = class MigrationController {
    constructor(migrationService) {
        this.migrationService = migrationService;
    }
    async runMigration() {
        return this.migrationService.triggerMigration();
    }
    async runSpecificMigration(migrationDto) {
        return this.migrationService.runSpecificMigration(migrationDto);
    }
    async revertMigration(migrationDto) {
        return this.migrationService.revertSpecificMigration(migrationDto);
    }
};
__decorate([
    (0, common_1.Post)('run'),
    (0, swagger_1.ApiOperation)({ summary: 'Run all pending migrations' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Migrations executed successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "runMigration", null);
__decorate([
    (0, common_1.Post)('run-specific'),
    (0, swagger_1.ApiOperation)({ summary: 'Run a specific migration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Migration executed successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [migration_dto_1.MigrationDto]),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "runSpecificMigration", null);
__decorate([
    (0, common_1.Post)('revert'),
    (0, swagger_1.ApiOperation)({ summary: 'Revert a specific migration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Migration reverted successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [migration_dto_1.MigrationDto]),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "revertMigration", null);
MigrationController = __decorate([
    (0, swagger_1.ApiTags)('Database Migrations'),
    (0, common_1.Controller)('migrations'),
    __metadata("design:paramtypes", [migration_service_1.MigrationService])
], MigrationController);
exports.MigrationController = MigrationController;
//# sourceMappingURL=migration.controller.js.map