import { DynamicModule, Type } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MigrationExistingConnectionOptions } from './interfaces/migration-options.interface';
interface MigrationExistingConnectionAsyncOptions {
    imports?: any[];
    inject?: any[];
    connectionName: string;
    useFactory: (...args: any[]) => Promise<Omit<MigrationExistingConnectionOptions, 'connectionName'>> | Omit<MigrationExistingConnectionOptions, 'connectionName'>;
    isGlobal?: boolean;
    exposeApi?: boolean;
}
export declare class MigrationModule {
    static forExistingConnection(options: MigrationExistingConnectionOptions): DynamicModule;
    static getConnectionToken(options: MigrationExistingConnectionAsyncOptions): Promise<string | Function | Type<DataSource>>;
    static forExistingConnectionAsync(options: MigrationExistingConnectionAsyncOptions): DynamicModule;
}
export {};
