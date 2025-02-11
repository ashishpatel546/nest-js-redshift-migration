import {
  DynamicModule,
  Module,
  Type,
  Provider,
  ValidationPipe,
} from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MigrationExistingConnectionOptions } from './interfaces/migration-options.interface';
import { MigrationService } from './migration.service';
import { REDSHIFT_DATASOURCE } from './constants/conection-name';
import { MigrationController } from './migration.controller';
import { APP_PIPE } from '@nestjs/core';

interface MigrationExistingConnectionAsyncOptions {
  imports?: any[];
  inject?: any[];
  connectionName: string;
  useFactory: (
    ...args: any[]
  ) =>
    | Promise<Omit<MigrationExistingConnectionOptions, 'connectionName'>>
    | Omit<MigrationExistingConnectionOptions, 'connectionName'>;
  isGlobal?: boolean;
  exposeApi?: boolean; // Add this property
}

@Module({})
export class MigrationModule {
  static forExistingConnection(
    options: MigrationExistingConnectionOptions
  ): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'MIGRATION_OPTIONS',
        useValue: options,
      },
      {
        provide: REDSHIFT_DATASOURCE,
        useFactory: (dataSource: DataSource) => dataSource,
        inject: [getDataSourceToken(options.connectionName)],
      },
      MigrationService,
      {
        provide: APP_PIPE,
        useValue: new ValidationPipe({
          transform: true,
          whitelist: true,
        }),
      },
    ];

    return {
      global: options.isGlobal,
      module: MigrationModule,
      providers,
      exports: [MigrationService],
      controllers: options.exposeApi ? [MigrationController] : [],
    };
  }

  static async getConnectionToken(
    options: MigrationExistingConnectionAsyncOptions
  ): Promise<string | Function | Type<DataSource>> {
    const args = options.inject
      ? await Promise.all(options.inject.map((token) => token))
      : [];
    return getDataSourceToken(options.connectionName);
  }

  static forExistingConnectionAsync(
    options: MigrationExistingConnectionAsyncOptions
  ): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'MIGRATION_OPTIONS',
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          return {
            ...config,
            connectionName: options.connectionName,
          };
        },
        inject: options.inject || [],
      },
      {
        provide: REDSHIFT_DATASOURCE,
        useFactory: (dataSource: DataSource) => dataSource,
        inject: [getDataSourceToken(options.connectionName)],
      },
      MigrationService,
      {
        provide: APP_PIPE,
        useValue: new ValidationPipe({
          transform: true,
          whitelist: true,
        }),
      },
    ];

    return {
      global: options.isGlobal,
      module: MigrationModule,
      imports: [...(options.imports || [])],
      providers,
      exports: [MigrationService],
      controllers: options.exposeApi ? [MigrationController] : [],
    };
  }
}
