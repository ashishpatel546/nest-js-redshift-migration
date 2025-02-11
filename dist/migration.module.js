"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MigrationModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const migration_service_1 = require("./migration.service");
const conection_name_1 = require("./constants/conection-name");
let MigrationModule = MigrationModule_1 = class MigrationModule {
    static forExistingConnection(options) {
        return {
            global: options.isGlobal,
            module: MigrationModule_1,
            providers: [
                {
                    provide: 'MIGRATION_OPTIONS',
                    useValue: Object.assign(Object.assign({}, options), { typeormConfig: undefined }),
                },
                {
                    provide: conection_name_1.REDSHIFT_DATASOURCE,
                    useFactory: (dataSource) => dataSource,
                    inject: [(0, typeorm_1.getDataSourceToken)(options.connectionName)],
                },
                migration_service_1.MigrationService,
            ],
            exports: [migration_service_1.MigrationService],
        };
    }
    static async getConnectionToken(options) {
        const args = options.inject
            ? await Promise.all(options.inject.map((token) => token))
            : [];
        return (0, typeorm_1.getDataSourceToken)(options.connectionName);
    }
    static forExistingConnectionAsync(options) {
        return {
            global: options.isGlobal,
            module: MigrationModule_1,
            imports: [...(options.imports || [])],
            providers: [
                {
                    provide: 'MIGRATION_OPTIONS',
                    useFactory: async (...args) => {
                        const config = await options.useFactory(...args);
                        return Object.assign(Object.assign({}, config), { connectionName: options.connectionName, typeormConfig: undefined });
                    },
                    inject: options.inject || [],
                },
                {
                    provide: conection_name_1.REDSHIFT_DATASOURCE,
                    useFactory: (dataSource) => dataSource,
                    inject: [(0, typeorm_1.getDataSourceToken)(options.connectionName)],
                },
                migration_service_1.MigrationService,
            ],
            exports: [migration_service_1.MigrationService],
        };
    }
};
MigrationModule = MigrationModule_1 = __decorate([
    (0, common_1.Module)({})
], MigrationModule);
exports.MigrationModule = MigrationModule;
//# sourceMappingURL=migration.module.js.map