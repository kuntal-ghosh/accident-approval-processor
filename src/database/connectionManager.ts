import { Pool, PoolConfig, QueryResult } from 'pg';
import { DatabaseConfig, databasesConfig } from '../config/database.config';

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private pools: Map<string, Pool>;

  private constructor() {
    this.pools = new Map<string, Pool>();
    
    // Initialize pools for each database
    this.initializePool('primary', databasesConfig.primary);
    this.initializePool('secondary', databasesConfig.secondary);
  }

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  private initializePool(name: string, config: DatabaseConfig): void {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: config.max,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    };

    this.pools.set(name, new Pool(poolConfig));
    
    // Add event listeners for pool errors
    const pool = this.pools.get(name);
    if (pool) {
      pool.on('error', (err) => {
        console.error(`Unexpected error on idle client in ${name} pool`, err);
      });
    }
  }

  public getPool(name: string): Pool | undefined {
    return this.pools.get(name);
  }

  public async executeQuery(
    poolName: string,
    queryText: string,
    params: any[] = []
  ): Promise<QueryResult> {
    const pool = this.getPool(poolName);
    if (!pool) {
      throw new Error(`Database pool '${poolName}' does not exist.`);
    }

    const client = await pool.connect();
    try {
      return await client.query(queryText, params);
    } finally {
      client.release();
    }
  }

  public async shutdown(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    this.pools.forEach((pool) => {
      promises.push(pool.end());
    });
    
    await Promise.all(promises);
    console.log('All database connections closed.');
  }
}

// Export a singleton instance
export const dbManager = DatabaseConnectionManager.getInstance();
