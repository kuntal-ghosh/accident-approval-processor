import DatabaseService from './db.service';
import database from '../config/database';
import { dbManager } from '../database/connectionManager';

class DatabaseSingleton {
  private static instance: DatabaseService | null = null;
  
  static async getInstance(): Promise<DatabaseService> {
    if (!this.instance) {
      this.instance = new DatabaseService(database);
      await this.instance.connect();
     const poolName= dbManager.getPool('primary');

      console.log('Database connection established for pool:', poolName);
    }
    return this.instance;
  }

  static async closeConnection(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
      console.log('Database connection closed');
    }
  }
}

export default DatabaseSingleton;
