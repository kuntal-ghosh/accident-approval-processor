import { Pool } from 'pg'; // Importing PostgreSQL client, change as needed for other DBs
import { config } from '../config/database';

export class DatabaseService {
    private pool: Pool;

    constructor() {
        this.pool = new Pool(config);
        this.pool.connect()
            .then(() => console.log('Database connection established successfully.'))
            .catch((error) => {
                console.error('Error connecting to the database:', error);
                throw error;
            }
        );
    }
    async connect(): Promise<void> {
        try {
            await this.pool.connect();
        }
        catch (error) {
            console.error('Error connecting to the database:', error);
            throw error;
        }
    }

    async fetchJsonData(query: string): Promise<any[]> {
        try {
            const result = await this.pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error fetching JSON data:', error);
            throw error;
        }
    }

    async closeConnection(): Promise<void> {
        await this.pool.end();
    }
}