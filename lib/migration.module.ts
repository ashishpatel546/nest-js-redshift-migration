import { DynamicModule, Module, Type } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MigrationExistingConnectionOptions } from './interfaces/migration-options.interface';
import { MigrationService } from './migration.service';
import { REDSHIFT_DATASOURCE } from './constants/conection-name';

interface MigrationExistingConnectionAsyncOptions {
  imports?: any[];
  inject?: any[];
  connectionName: string; // Add connectionName here
  useFactory: (
    ...args: any[]
  ) =>
    | Promise<Omit<MigrationExistingConnectionOptions, 'connectionName'>>
    | Omit<MigrationExistingConnectionOptions, 'connectionName'>;
  isGlobal?: boolean;
}

@Module({})
export class MigrationModule {

  static forExistingConnection(
    options: MigrationExistingConnectionOptions
  ): DynamicModule {
    return {
      global: options.isGlobal,
      module: MigrationModule,
      providers: [
        {
          provide: 'MIGRATION_OPTIONS',
          useValue: {
            ...options,
          },
        },
        {
          provide: REDSHIFT_DATASOURCE,
          useFactory: (dataSource: DataSource) => dataSource,
          inject: [getDataSourceToken(options.connectionName)],
        },
        MigrationService,
      ],
      exports: [MigrationService],
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
    return {
      global: options.isGlobal,
      module: MigrationModule,
      imports: [...(options.imports || [])],
      providers: [
        {
          provide: 'MIGRATION_OPTIONS',
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return {
              ...config,
              connectionName: options.connectionName
            };
          },
          inject: options.inject || [],
        },
        {
          provide: REDSHIFT_DATASOURCE,
          useFactory: (dataSource: DataSource) => dataSource,
          inject: [getDataSourceToken(options.connectionName)], // Use connectionName directly from options
        },
        MigrationService,
      ],
      exports: [MigrationService],
    };
  }
}
