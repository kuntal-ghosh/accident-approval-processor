import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { AccidentReport } from './models';
import { transformAccidentReports } from './utils/dataTransformer';
import { AccidentCriteriaExtractor } from './services/criteria-extraction.service';
import DatabaseSingleton from './services/db.singleton';
import { dbManager } from './database/connectionManager';
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

/**
 * @api {get} /api/sync-submitted-report Synchronize Submitted Reports
 * @apiName SyncSubmittedReports
 * @apiGroup Reports
 * @apiDescription Fetches accident reports from the source database and synchronizes them to the local database.
 * Creates a new table if it doesn't exist and avoids duplicate entries.
 * 
 * @apiSuccess {Object[]} reports Array of synchronized accident reports
 * @apiError {String} message Error message
 */
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

/**
 * @api {get} /api/extract-criteria Extract Approval Criteria
 * @apiName ExtractCriteria
 * @apiGroup Criteria
 * @apiDescription Analyzes accident reports to extract approval criteria using AI.
 * Saves the extracted criteria with version information.
 * 
 * @apiParam {String} [description] Optional description for the criteria version
 * 
 * @apiSuccess {Object} criteria The extracted criteria rules
 * @apiSuccess {Number} version Version number of the saved criteria
 * @apiSuccess {Date} createdAt Creation timestamp
 * @apiSuccess {Boolean} isActive Whether this is the active criteria version
 * 
 * @apiError {String} message Error message
 */
app.get('/api/extract-criteria', async (req: Request, res: Response) => {
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

/**
 * @api {post} /api/criteria Save Criteria
 * @apiName SaveCriteria
 * @apiGroup Criteria
 * @apiDescription Saves manually created or updated criteria with versioning.
 * 
 * @apiParam {Object} criteria The criteria rules to save
 * @apiParam {String} [description] Optional description for the criteria version
 * 
 * @apiSuccess {Object} criteria The saved criteria
 * @apiSuccess {Number} version Version number
 * @apiSuccess {Date} createdAt Creation timestamp
 * @apiSuccess {Boolean} isActive Whether this is the active criteria version
 * 
 * @apiError {Object} error Error details
 */
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

/**
 * @api {get} /api/criteria/active Get Active Criteria
 * @apiName GetActiveCriteria
 * @apiGroup Criteria
 * @apiDescription Retrieves the currently active criteria version used for evaluating reports.
 * 
 * @apiSuccess {Object} criteria The active criteria rules
 * @apiSuccess {Number} version Version number
 * @apiSuccess {Date} createdAt Creation timestamp
 * @apiSuccess {Boolean} isActive Always true for this endpoint
 * 
 * @apiError {String} message Error message when no active criteria exists
 * @apiError {Object} error Error details
 */
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

/**
 * @api {get} /api/criteria/versions Get All Criteria Versions
 * @apiName GetAllCriteriaVersions
 * @apiGroup Criteria
 * @apiDescription Retrieves all saved criteria versions with their metadata.
 * 
 * @apiSuccess {Object[]} versions Array of all criteria versions with metadata
 * @apiError {Object} error Error details
 */
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

/**
 * @api {get} /api/criteria/versions/:version Get Criteria by Version
 * @apiName GetCriteriaByVersion
 * @apiGroup Criteria
 * @apiDescription Retrieves a specific criteria version by its version number.
 * 
 * @apiParam {Number} version The version number to retrieve
 * 
 * @apiSuccess {Object} criteria The criteria rules for the requested version
 * @apiSuccess {Number} version Version number
 * @apiSuccess {Date} createdAt Creation timestamp
 * @apiSuccess {Boolean} isActive Whether this is the active criteria version
 * 
 * @apiError {String} message Error message if version is invalid or not found
 * @apiError {Object} error Error details
 */
app.get('/api/criteria/versions/:version', async (req: Request, res: Response) => {
    try {
        const version = parseInt(req.params.version);
        if (isNaN(version)) {
             res.status(400).json({ message: 'Invalid version number' });
             return;
        }
        
        const criteriaVersion = await criteriaVersionService.getCriteriaByVersion(version);
        if (criteriaVersion) {
            res.status(200).json(criteriaVersion);
        } else {
            res.status(404).json({ message: 'Version not found' });
        }
    } catch (error) {
        console.error('Error fetching criteria version:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

/**
 * @api {post} /api/criteria/versions/:version/activate Activate Criteria Version
 * @apiName ActivateCriteriaVersion
 * @apiGroup Criteria
 * @apiDescription Sets a specific criteria version as active for report evaluation.
 * 
 * @apiParam {Number} version The version number to set as active
 * 
 * @apiSuccess {String} message Success message
 * @apiError {String} message Error message if version is invalid or not found
 * @apiError {Object} error Error details
 */
app.post('/api/criteria/versions/:version/activate', async (req: Request, res: Response) => {
    try {
        const version = parseInt(req.params.version);
        if (isNaN(version)) {
             res.status(400).json({ message: 'Invalid version number' });
             return;
        }
        
        const success = await criteriaVersionService.setActiveVersion(version);
        if (success) {
            res.status(200).json({ message: `Version ${version} set as active` });
        } else {
            res.status(404).json({ message: 'Version not found' });
        }
    } catch (error) {
        console.error('Error activating criteria version:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

/**
 * @api {get} /api/last-approved Get Last Approved Report
 * @apiName GetLastApprovedReport
 * @apiGroup Reports
 * @apiDescription Retrieves the most recently approved accident report.
 * 
 * @apiSuccess {Object} report The complete report data
 * @apiError {Object} error Error details
 */
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

/**
 * @api {get} /api/last-rejected Get Last Rejected Report
 * @apiName GetLastRejectedReport
 * @apiGroup Reports
 * @apiDescription Retrieves the most recently rejected accident report.
 * 
 * @apiSuccess {Object} report The complete report data
 * @apiError {Object} error Error details
 */
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

/**
 * @api {get} /api/accident-reports Get All Accident Reports
 * @apiName GetAccidentReports
 * @apiGroup Reports
 * @apiDescription Retrieves a paginated list of accident reports with filtering options.
 * 
 * @apiParam {Number} [page=1] Page number for pagination
 * @apiParam {Number} [limit=10] Number of records per page
 * @apiParam {String} [search] Search term for filtering across multiple fields
 * @apiParam {String} [status] Filter by approval status
 * @apiParam {String} [predictionResult] Filter by AI prediction result
 * @apiParam {String} [startDate] Filter reports on or after this date (YYYY-MM-DD)
 * @apiParam {String} [endDate] Filter reports on or before this date (YYYY-MM-DD)
 * @apiParam {String} [sortBy=report_date] Field to sort by (report_date, report_id, approval_status, prediction_result, predicted_on)
 * @apiParam {String} [sortOrder=desc] Sort order (asc, desc)
 * 
 * @apiSuccess {Object[]} data Array of accident reports
 * @apiSuccess {Object} pagination Pagination details including total count
 * @apiSuccess {Object} filters Applied filter parameters
 * 
 * @apiError {Object} error Error details
 */
app.get('/api/accident-reports', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        
        // Search parameters
        const searchTerm = req.query.search as string;
        const status = req.query.status as string;
        const predictionResult = req.query.predictionResult as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
        const sortBy = req.query.sortBy as string || 'report_date';
        const sortOrder = (req.query.sortOrder as string || 'desc').toUpperCase();
        
        // Base query parts
        let whereClause = '';
        const queryParams: any[] = [];
        let paramCount = 1;
        
        // Build search filters
        const conditions = [];
        
        if (searchTerm) {
            conditions.push(`(
              report_id ILIKE $${paramCount} OR 
              rcf_details::text ILIKE $${paramCount} OR
              approval_status ILIKE $${paramCount} OR
              prediction_result ILIKE $${paramCount} OR
              logic_behind_prediction ILIKE $${paramCount} OR
              to_char(report_date, 'YYYY-MM-DD') ILIKE $${paramCount} OR
              to_char(predicted_on, 'YYYY-MM-DD') ILIKE $${paramCount}
            )`);
            queryParams.push(`%${searchTerm}%`);
            paramCount++;
        }
        
        if (status) {
            conditions.push(`approval_status = $${paramCount}`);
            queryParams.push(status);
            paramCount++;
        }
        
        if (predictionResult) {
            conditions.push(`prediction_result = $${paramCount}`);
            queryParams.push(predictionResult);
            paramCount++;
        }
        
        // Date range filtering
        if (startDate) {
            conditions.push(`report_date >= $${paramCount}::timestamp`);
            queryParams.push(startDate);
            paramCount++;
        }
        
        if (endDate) {
            conditions.push(`report_date <= $${paramCount}::timestamp`);
            queryParams.push(endDate);
            paramCount++;
        }
        
        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }
        
        // Validate sort parameters to prevent SQL injection
        const validSortColumns = ['report_date', 'report_id', 'approval_status', 'prediction_result', 'predicted_on'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const orderBy = validSortColumns.includes(sortBy) ? sortBy : 'report_date';
        const orderDirection = validSortOrders.includes(sortOrder) ? sortOrder : 'DESC';
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) FROM reports.accident_reports
            ${whereClause}
        `;
        const countResult = await dbManager.executeQuery('primary', countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].count);
        
        // Add pagination parameters
        queryParams.push(limit);
        queryParams.push(offset);
        
        // Get paginated data
        const query = `
            SELECT * FROM reports.accident_reports
            ${whereClause}
            ORDER BY ${orderBy} ${orderDirection}, report_date DESC, predicted_on DESC NULLS LAST
            LIMIT $${paramCount++} OFFSET $${paramCount}
        `;
        const result = await dbManager.executeQuery('primary', query, queryParams);
        
        res.status(200).json({
            data: result.rows,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            },
            filters: {
                search: searchTerm || null,
                status: status || null,
                predictionResult: predictionResult || null,
                startDate: startDate || null,
                endDate: endDate || null,
                sortBy: orderBy,
                sortOrder: orderDirection
            }
        });
    } catch (error) {
        console.error('Error fetching accident reports:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

/**
 * @api {get} /api/accident-reports/:reportId Get Accident Report by ID
 * @apiName GetAccidentReportById
 * @apiGroup Reports
 * @apiDescription Retrieves a specific accident report by its ID.
 * 
 * @apiParam {String} reportId Unique identifier of the report
 * 
 * @apiSuccess {Object} report The complete accident report data
 * @apiError {String} message Error message if report is not found
 * @apiError {Object} error Error details
 */
app.get('/api/accident-reports/:reportId', async (req: Request, res: Response) => {
    try {
        const reportId = req.params.reportId;
        if (!reportId) {
             res.status(400).json({ message: 'Report ID is required' });
             return;
        }
        const query = `
            SELECT * FROM reports.accident_reports
            WHERE report_id = $1
        `;
        const result = await dbManager.executeQuery('primary', query, [reportId]);
        if (result.rows.length === 0) {
             res.status(404).json({ message: 'Report not found' });
             return;
        }
        const report = result.rows[0];
        res.status(200).json({
            success: true,
            data: {
            report: {
                id: report.report_id,
                reportedDate: report.report_date,
                details: report.rcf_details,
                originalStatus: report.approval_status,
                predictionStatus: report.prediction_result,
                predictionReason: report.logic_behind_prediction,
                predictedAt: report.predicted_on
                
            }
            },
            metadata: {
            retrievedAt: new Date(),
            predictionTimestamp: report.predicted_on
            }
        });
    } catch (error) {
        console.error('Error fetching accident report:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: (error as Error).message
        });
    }
});

/**
 * @api {post} /api/evaluate-report/:reportId Evaluate Report
 * @apiName EvaluateReport
 * @apiGroup Reports
 * @apiDescription Evaluates an accident report using AI against the active criteria.
 * Updates the report with the evaluation result.
 * 
 * @apiParam {String} reportId Unique identifier of the report to evaluate
 * 
 * @apiSuccess {String} status Success status
 * @apiSuccess {String} reportId ID of the evaluated report
 * @apiSuccess {Object} evaluation Evaluation results including prediction and reasoning
 * @apiSuccess {Object} updatedReport The updated report with evaluation results
 * 
 * @apiError {String} status Error status
 * @apiError {String} message Error message
 * @apiError {String} error Error details
 */
app.post('/api/evaluate-report/:reportId', async (req: Request, res: Response) => {
    try {

        // Start timing for performance metrics
        const startTime = Date.now();
    
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

Provide a detailed evaluation and conclude with a clear APPROVE or DISAPPROVE decision.
wrap the final decision in **APPROVE** or **DISAPPROVE**`;

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
        if (response?.includes("**APPROVE**")) {
            decision = "Approved";
        } else if (response?.includes("**DISAPPROVE**")) {
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

        const updatedReport = updateResult.rows[0];
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // Return the evaluation result
        // res.status(200).json({
        //     status: 'success',
        //     reportId,
        //     evaluation: {
        //         result: decision,
        //         reasoning: response,
        //         predictedOn: new Date(),
        //         criteriaVersion: activeCriteria?.version
        //     },
        //     updatedReport: updateResult.rows[0]
        // });
         res.status(200).json({
            success: true,
            data: {
              report: {
                id: updatedReport.report_id,
                status: updatedReport.prediction_result,
                evaluatedAt: updatedReport.predicted_on,
                criteriaVersion: activeCriteria?.version,
                metadata: {
                  reportDate: updatedReport.report_date,
                  originalStatus: updatedReport.approval_status
                }
              },
              evaluation: {
                result: decision,
                reasoning: {
                  fullText: response
                }
              }
            },
            meta: {
              processingTime: `${processingTime}s`,
              modelUsed: "gpt-4o"
            }
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
