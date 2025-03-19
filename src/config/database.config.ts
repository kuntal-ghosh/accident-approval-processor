export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  max?: number; // maximum number of clients the pool should contain
}

export interface DatabasesConfig {
  primary: DatabaseConfig;
  secondary: DatabaseConfig;
}

// Load from environment variables or configuration file
export const databasesConfig: DatabasesConfig = {
  primary: {
    host: process.env.PRIMARY_DB_HOST || 'localhost',
    port: parseInt(process.env.PRIMARY_DB_PORT || '5432', 10),
    username: process.env.PRIMARY_DB_USERNAME || 'postgres',
    password: process.env.PRIMARY_DB_PASSWORD || 'password',
    database: process.env.PRIMARY_DB_NAME || 'primary_db',
    ssl: process.env.PRIMARY_DB_SSL === 'true',
    // max: parseInt(process.env.PRIMARY_DB_POOL_SIZE || '20', 10),
    // connectionTimeoutMillis: 30000,
    // idleTimeoutMillis: 30000,
  },
  secondary: {
    host: process.env.SECONDARY_DB_HOST || 'localhost',
    port: parseInt(process.env.SECONDARY_DB_PORT || '5432', 10),
    username: process.env.SECONDARY_DB_USERNAME || 'postgres',
    password: process.env.SECONDARY_DB_PASSWORD || 'password',
    database: process.env.SECONDARY_DB_NAME || 'secondary_db',
    ssl: process.env.SECONDARY_DB_SSL === 'true',
    max: parseInt(process.env.SECONDARY_DB_POOL_SIZE || '20', 10),
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  }
};
