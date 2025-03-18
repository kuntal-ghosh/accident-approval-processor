import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { AccidentReport } from './models';
import { transformAccidentReports } from './utils/dataTransformer';
import { AccidentCriteriaExtractor } from './services/criteria-extraction.service';
import DatabaseSingleton from './services/db.singleton';

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;
app.use(express.json());

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found in environment variables");
}

const handleDatabaseQuery = async (query: string) => {
    const dbService = await DatabaseSingleton.getInstance();
    return await dbService.query(query);
};

const saveToFile = async (filePath: string, data: any) => {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
                console.error("Error saving file:", err);
                reject(err);
            } else {
                console.log(`Data saved to ${filePath}`);
                resolve();
            }
        });
    });
};

app.get('/extract-criteria', async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT data->'driverRCFDetails' AS RCF_Details, 
            data->'driverRCFAPPROVE'->> 'APPROVE REPORT?' AS Approval_Status 
            FROM public.grout_record 
            WHERE data ? 'driverRCFAPPROVE' 
                AND data->'driverRCFAPPROVE' IS NOT NULL 
                AND data->'driverRCFAPPROVE' != 'null'::jsonb 
                AND data->'driverRCFAPPROVE' != '[null]'::jsonb;
        `;
        const records = await handleDatabaseQuery(query);
        const formattedRecords: AccidentReport[] = transformAccidentReports(records.rows);

        const criteriaExtractor = new AccidentCriteriaExtractor(apiKey);
        const criteria = await criteriaExtractor.extractCriteria(formattedRecords);

        // await saveToFile("./data/extracted-criteria.json", { criteria });

        res.status(200).send(criteria);
    } catch (error) {
        console.error('Error extracting criteria:', error);
        res.status(500).send('Internal Server Error');
    }
});
// data->'driverRCFDetails' AS RCF_Details

app.get('/api/last-approved', async (_req: Request, res: Response) => {
    try {
        const query = `
            SELECT data
            FROM public.grout_record 
            WHERE data ? 'driverRCFAPPROVE' 
                AND data->'driverRCFAPPROVE' IS NOT NULL 
                AND data->'driverRCFAPPROVE' != 'null'::jsonb 
                AND data->'driverRCFAPPROVE' != '[null]'::jsonb
                AND (data->'driverRCFAPPROVE'->'APPROVE REPORT?') @>'"Approve"'
            ORDER BY created DESC
            LIMIT 1;
        `;
        const result = await handleDatabaseQuery(query);
        res.status(200).send(result.rows[0].data);
    } catch (error) {
        console.error('Error fetching last approved report:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});
// SELECT data->'driverRCFDetails' AS RCF_Details

app.get('/api/last-rejected', async (_req: Request, res: Response) => {
    try {
        const query = `
            SELECT data
            FROM public.grout_record
            WHERE data ? 'driverRCFAPPROVE'
                AND data->'driverRCFAPPROVE' IS NOT NULL
                AND data->'driverRCFAPPROVE' != 'null'::jsonb
                AND data->'driverRCFAPPROVE' != '[null]'::jsonb
                AND (data->'driverRCFAPPROVE'->'APPROVE REPORT?') @>'"Not Approve"'

            ORDER BY created DESC
            LIMIT 1;
        `;
        const result = await handleDatabaseQuery(query);
        res.status(200).send(result.rows[0].data);
    } catch (error) {
        console.error('Error fetching last rejected report:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

// Initialize the database connection when the app starts
const server = app.listen(port, async () => {
    console.log(`Server is running on http://localhost:${port}`);
    try {
        // Initialize the singleton database instance
        await DatabaseSingleton.getInstance();
        console.log('Connected to the PostgreSQL database.');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await DatabaseSingleton.closeConnection();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await DatabaseSingleton.closeConnection();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
