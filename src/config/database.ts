import { Pool } from 'pg'; // Importing PostgreSQL client, change as needed for other databases
import { DatabaseConfig } from '../types/database';

export const config: DatabaseConfig = {
    host: 'localhost',
    user: 'developer',
    password: 'Karnob@711',
    database: 'driver_db',
    port: 5432,
    dialect: 'postgres',
};

const pool = new Pool(config);

export const connectToDatabase = async () => {
    try {
        await pool.connect();
        console.log('Database connection established successfully.');
    } catch (error) {
        console.error('Error connecting to the database:', error);
        throw error;
    }
};

export const getPool = () => pool;