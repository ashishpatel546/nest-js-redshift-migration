import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Entity to track migration history in the database
 */
@Entity()
export class MigrationHistory {
  /** Unique identifier for the migration record */
  @PrimaryColumn()
  id?: number;

  /** Name of the migration file */
  @Column()
  migration_file_name: string;

  /** Directory key where migration is stored */
  @Column()
  migration_dir_key: string;

  /** Timestamp when migration was created */
  @Column()
  created_on: Date;

  /** Unix timestamp of the migration */
  @Column({ type: 'bigint' })
  timestamp: number;
}
