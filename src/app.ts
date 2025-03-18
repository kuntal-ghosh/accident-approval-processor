import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { AccidentReport } from './models';
import { transformAccidentReports } from './utils/dataTransformer';
import { AccidentCriteriaExtractor } from './services/criteria-extraction.service';
import DatabaseSingleton from './services/db.singleton';
import { dbManager } from './database/connectionManager';
import { userService } from './services/userService';
import { criteriaVersionService } from './services/criteriaVersion.service';

import OpenAI from 'openai'; // Make sure to install: npm install openai


dotenv.config();

const app = express();
const port = process.env.PORT || 3005;
app.use(express.json());

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found in environment variables");
}


// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });


  
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


app.get('/api/sync-submitted-report',async (_req: Request, res: Response) => {
    try {
        const query = `
            SELECT uuid,
            created,
            data->'driverRCFDetails' AS RCF_Details, 
            data->'driverRCFAPPROVE'->> 'APPROVE REPORT?' AS Approval_Status 
            FROM public.grout_record 
            WHERE data ? 'driverRCFAPPROVE' 
                AND data->'driverRCFAPPROVE' IS NOT NULL 
                AND data->'driverRCFAPPROVE' != 'null'::jsonb 
                AND data->'driverRCFAPPROVE' != '[null]'::jsonb;
        `;
        const records = await handleDatabaseQuery(query);
        const formattedRecords: AccidentReport[] = transformAccidentReports(records.rows);
        // Save formatted records to the primary database
        // Generate a unique ID for each record to check for duplicates
        await Promise.all(formattedRecords.map(async (record) => {
            // Create a unique identifier based on report data
            const uniqueIdentifier = record.uuid 
            
            // Check if this record already exists in the database
            const checkQuery = `
                SELECT report_id FROM reports.accident_reports 
                WHERE report_id = $1
            `;
            
            const existingRecord = await dbManager.executeQuery('primary', checkQuery, [uniqueIdentifier]);
            
            // Only insert if the record doesn't already exist
            if (existingRecord.rows.length === 0) {
                // Check if table exists
                const checkTableQuery = `
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = 'reports' 
                        AND table_name = 'accident_reports'
                    );
                `;
                const tableExists = await dbManager.executeQuery('primary', checkTableQuery);
                
                if (!tableExists.rows[0].exists) {
                    console.log('Creating accident_reports table...');
                    const createTableQuery = `
                        CREATE SCHEMA IF NOT EXISTS reports;
                        CREATE TABLE reports.accident_reports (
                            report_id VARCHAR(255) PRIMARY KEY,
                            report_date TIMESTAMP,
                            rcf_details JSONB,
                            approval_status VARCHAR(50),
                            prediction_result VARCHAR(50),
                            logic_behind_prediction TEXT,
                            predicted_on TIMESTAMP
                        );
                    `;
                    await dbManager.executeQuery('primary', createTableQuery);
                }
                
                const insertQuery = `
                    INSERT INTO reports.accident_reports (
                        report_id, report_date, rcf_details, approval_status,prediction_result,logic_behind_prediction,predicted_on
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `;
                
                await dbManager.executeQuery('primary', insertQuery, [
                    uniqueIdentifier,
                    record.created,
                    JSON.stringify(record.rcf_details),
                    record.approval_status,
                    "Pending",
                    "Pending",
                    null
                ]);
                console.log(`Record with identifier ${uniqueIdentifier} inserted`);
            } else {
                console.log(`Record with identifier ${uniqueIdentifier} already exists, skipping`);
            }
        }));

        console.log(`Processed ${formattedRecords.length} accident reports`);
        res.status(200).send(formattedRecords);
        // dbManager.executeQuery('primary', query).then((result) => {
        //     res.status(200).send(result.rows);
        // });
    } catch (error) {
        console.error('Error fetching submitted reports:', error);
        res.status(500).send('Internal Server Error');
    }
    
});
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

        // Save criteria to database with versioning
        const description = req.query.description as string || `Criteria extracted on ${new Date().toISOString()}`;
        const savedVersion = await criteriaVersionService.saveCriteriaVersion(criteria, description);

        // Optional: also save to file for backup
        // await saveToFile("./data/extracted-criteria.json", { 
        //     criteria,
        //     version: savedVersion.version,
        //     createdAt: savedVersion.createdAt
        // });

        res.status(200).send({
            criteria,
            version: savedVersion.version,
            createdAt: savedVersion.createdAt,
            isActive: savedVersion.isActive
        });
    } catch (error) {
        console.error('Error extracting criteria:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/criteria', async (req: Request, res: Response) => {
    try {
        console.log('Received criteria:', req.body?.criteria);
        const description = req.query.description as string || `Criteria uploaded on ${new Date().toISOString()}`;
        const savedVersion = await criteriaVersionService.saveCriteriaVersion(req.body?.criteria, description);
        res.status(201).json({
            criteria: req.body,
            version: savedVersion.version,
            createdAt: savedVersion.createdAt,
            isActive: savedVersion.isActive
        });
    } catch (error) {
        console.error('Error saving criteria:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});
// Add new API endpoints to manage criteria versions
app.get('/api/criteria/active', async (_req: Request, res: Response) => {
    try {
        const activeCriteria = await criteriaVersionService.getActiveCriteria();
        if (activeCriteria) {
            res.status(200).json(activeCriteria);
        } else {
            res.status(404).json({ message: 'No active criteria found' });
        }
    } catch (error) {
        console.error('Error fetching active criteria:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

app.get('/api/criteria/versions', async (_req: Request, res: Response) => {
    try {
        const versions = await criteriaVersionService.getAllVersions();
        res.status(200).json(versions);
    } catch (error) {
        console.error('Error fetching criteria versions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

// app.get('/api/criteria/versions/:version', async (req: Request, res: Response) => {
//     try {
//         const version = parseInt(req.params.version);
//         if (isNaN(version)) {
//             return res.status(400).json({ message: 'Invalid version number' });
//         }
        
//         const criteriaVersion = await criteriaVersionService.getCriteriaByVersion(version);
//         if (criteriaVersion) {
//             res.status(200).json(criteriaVersion);
//         } else {
//             res.status(404).json({ message: 'Version not found' });
//         }
//     } catch (error) {
//         console.error('Error fetching criteria version:', error);
//         res.status(500).json({
//             status: 'error',
//             message: 'Internal Server Error',
//             error: (error as Error).message
//         });
//     }
// });

// app.post('/api/criteria/versions/:version/activate', async (req: Request, res: Response) => {
//     try {
//         const version = parseInt(req.params.version);
//         if (isNaN(version)) {
//             return res.status(400).json({ message: 'Invalid version number' });
//         }
        
//         const success = await criteriaVersionService.setActiveVersion(version);
//         if (success) {
//             res.status(200).json({ message: `Version ${version} set as active` });
//         } else {
//             res.status(404).json({ message: 'Version not found' });
//         }
//     } catch (error) {
//         console.error('Error activating criteria version:', error);
//         res.status(500).json({
//             status: 'error',
//             message: 'Internal Server Error',
//             error: (error as Error).message
//         });
//     }
// });

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

app.post('/users', async (req: Request, res: Response) => {
    try {
      const newUser = await userService.createUser(req.body);
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

app.get('/users/:id', async (req: Request, res: Response) => {
    try {
      const user = await userService.getUserById(Number(req.params.id));
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  });



  app.post('/api/evaluate-report/:reportId', async (req: Request, res: Response) => {
    try {
        const reportId = req.params.reportId;
        if (!reportId) {
              res.status(400).json({ 
                status: 'error', 
                message: 'Report ID is required' 
            });
            return;
        }
        
        // Get report data from the database
        const reportQuery = `
            SELECT * FROM reports.accident_reports 
            WHERE report_id = $1
        `;
        const reportResult = await dbManager.executeQuery('primary', reportQuery, [reportId]);
        
        if (reportResult.rows.length === 0) {
             res.status(404).json({ 
                status: 'error', 
                message: 'Report not found' 
            });
        }
        
        const report = reportResult.rows[0];
        const reportData = report.rcf_details;
        
        // Get active criteria from the service
        const activeCriteria = await criteriaVersionService.getActiveCriteria();
        if (!activeCriteria) {
             res.status(404).json({ 
                status: 'error', 
                message: 'No active criteria found' 
            });
        }
        
        // Prepare the prompt for OpenAI
        const systemMessage = `You are an expert report evaluator responsible for reviewing accident reports.
Analyze the report data against these specific criteria:

${JSON.stringify(activeCriteria?.criteria, null, 2)}

Provide a detailed evaluation and conclude with a clear APPROVE or DISAPPROVE decision.`;

        const userMessage = `Here is the report data to evaluate:
${JSON.stringify(reportData, null, 2)}

Please analyze this report against each criterion and make your decision.`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Or another appropriate model
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            temperature: 0.1, // Lower temperature for more consistent results
        });
        
        const response = completion.choices[0].message.content;
        
        // Extract the decision from the response
        let decision = "Undetermined";
        if (response?.includes("APPROVE")) {
            decision = "Approved";
        } else if (response?.includes("DISAPPROVE")) {
            decision = "Disapproved";
        }
        
        // Update the report with the prediction
        const updateQuery = `
            UPDATE reports.accident_reports 
            SET prediction_result = $1,
                logic_behind_prediction = $2,
                predicted_on = NOW()
            WHERE report_id = $3
            RETURNING *
        `;
        
        const updateResult = await dbManager.executeQuery(
            'primary', 
            updateQuery, 
            [decision, response, reportId]
        );
        
        // Return the evaluation result
        res.status(200).json({
            status: 'success',
            reportId,
            evaluation: {
                result: decision,
                reasoning: response,
                predictedOn: new Date(),
                criteriaVersion: activeCriteria?.version
            },
            updatedReport: updateResult.rows[0]
        });
        
    } catch (error) {
        console.error('Error evaluating report:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

// Add an endpoint to evaluate all pending reports
// app.post('/api/evaluate-all-pending', async (_req: Request, res: Response) => {
//     try {
//         // Get all reports with "Pending" status
//         const pendingQuery = `
//             SELECT report_id FROM reports.accident_reports
//             WHERE prediction_result = 'Pending'
//         `;
        
//         const pendingResult = await dbManager.executeQuery('primary', pendingQuery);
//         const pendingReports = pendingResult.rows;
        
//         if (pendingReports.length === 0) {
//             return res.status(200).json({
//                 status: 'success',
//                 message: 'No pending reports to evaluate'
//             });
//         }
        
//         // Process each report (consider using a queue for large numbers)
//         const processedIds = [];
//         const errors = [];
        
//         // Process sequentially to avoid rate limits
//         for (const report of pendingReports) {
//             try {
//                 // Make internal request to evaluate endpoint
//                 // Normally you'd use axios or fetch, but we'll call directly
//                 const reportId = report.report_id;
                
//                 // Get report data from the database
//                 const reportQuery = `
//                     SELECT * FROM reports.accident_reports 
//                     WHERE report_id = $1
//                 `;
//                 const reportResult = await dbManager.executeQuery('primary', reportQuery, [reportId]);
//                 const reportData = reportResult.rows[0].rcf_details;
                
//                 // Get active criteria
//                 const activeCriteria = await criteriaVersionService.getActiveCriteria();
//                 if (!activeCriteria) {
//                     throw new Error('No active criteria found');
//                 }
                
//                 // Call OpenAI
//                 const systemMessage = `You are an expert report evaluator responsible for reviewing accident reports.
// Analyze the report data against these specific criteria:

// ${JSON.stringify(activeCriteria.criteria, null, 2)}

// Provide a detailed evaluation and conclude with a clear APPROVE or DISAPPROVE decision.`;

//                 const userMessage = `Here is the report data to evaluate:
// ${JSON.stringify(reportData, null, 2)}

// Please analyze this report against each criterion and make your decision.`;

//                 const completion = await openai.chat.completions.create({
//                     model: "gpt-4-turbo",
//                     messages: [
//                         { role: "system", content: systemMessage },
//                         { role: "user", content: userMessage }
//                     ],
//                     temperature: 0.1,
//                     max_tokens: 2000
//                 });
                
//                 const response = completion.choices[0].message.content;
//                 let decision = "Undetermined";
                
//                 if (response?.includes("APPROVE")) {
//                     decision = "Approved";
//                 } else if (response?.includes("DISAPPROVE")) {
//                     decision = "Disapproved";
//                 }
                
//                 // Update the report
//                 const updateQuery = `
//                     UPDATE reports.accident_reports 
//                     SET prediction_result = $1,
//                         logic_behind_prediction = $2,
//                         predicted_on = NOW()
//                     WHERE report_id = $3
//                 `;
                
//                 await dbManager.executeQuery('primary', updateQuery, [decision, response, reportId]);
//                 processedIds.push(reportId);
                
//                 // Add a delay to avoid rate limiting
//                 await new Promise(resolve => setTimeout(resolve, 1000));
                
//             } catch (reportError) {
//                 console.error(`Error processing report ${report.report_id}:`, reportError);
//                 errors.push({
//                     reportId: report.report_id,
//                     error: (reportError as Error).message
//                 });
//             }
//         }
        
//         res.status(200).json({
//             status: 'success',
//             message: `Processed ${processedIds.length} of ${pendingReports.length} reports`,
//             processedIds,
//             errors: errors.length > 0 ? errors : undefined
//         });
        
//     } catch (error) {
//         console.error('Error evaluating pending reports:', error);
//         res.status(500).json({
//             status: 'error',
//             message: 'Internal Server Error',
//             error: (error as Error).message
//         });
//     }
// });

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
