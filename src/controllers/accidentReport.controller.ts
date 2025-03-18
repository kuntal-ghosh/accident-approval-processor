import { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { transformAccidentReports } from '../utils/dataTransformer';
import { dbManager } from '../database/connectionManager';
import DatabaseSingleton from '../services/db.singleton';

/**
 * Synchronizes accident reports from the external system to local database
 */
export const syncSubmittedReports = asyncHandler(async (_req: Request, res: Response) => {
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

  const dbService = await DatabaseSingleton.getInstance();
  const records = await dbService.query(query);
  const formattedRecords = transformAccidentReports(records.rows);
  
  // Create schema and table if they don't exist
  await ensureReportTableExists();
  
  // Track processed records
  const processedIds = [];
  const skippedIds = [];

  // Insert non-duplicates into database
  for (const record of formattedRecords) {
    const uniqueIdentifier = record.uuid;
    
    // Skip records with no UUID
    if (!uniqueIdentifier) {
      console.warn('Skipping record with undefined UUID');
      continue;
    }
    
    try {
      const existingRecord = await checkIfReportExists(uniqueIdentifier);
      
      if (!existingRecord) {
        await insertReport(record);
        processedIds.push(uniqueIdentifier);
      } else {
        skippedIds.push(uniqueIdentifier);
      }
    } catch (error) {
      console.error(`Error processing record ${uniqueIdentifier}:`, error);
      throw new AppError(`Failed to process record ${uniqueIdentifier}`, 500);
    }
  }

  console.log(`Processed ${processedIds.length} new accident reports, skipped ${skippedIds.length} existing reports`);
  
  res.status(200).json({
    status: 'success',
    message: `Synchronized ${processedIds.length} new reports`,
    data: {
      processed: processedIds.length,
      skipped: skippedIds.length,
      total: formattedRecords.length
    }
  });
});

/**
 * Retrieves the most recently approved accident report
 */
export const getLastApprovedReport = asyncHandler(async (_req: Request, res: Response) => {
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

  const dbService = await DatabaseSingleton.getInstance();
  const result = await dbService.query(query);
  
  if (result.rows.length === 0) {
    throw new AppError('No approved reports found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: result.rows[0].data
  });
});

/**
 * Retrieves the most recently rejected accident report
 */
export const getLastRejectedReport = asyncHandler(async (_req: Request, res: Response) => {
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

  const dbService = await DatabaseSingleton.getInstance();
  const result = await dbService.query(query);
  
  if (result.rows.length === 0) {
    throw new AppError('No rejected reports found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: result.rows[0].data
  });
});

// Helper functions
async function ensureReportTableExists(): Promise<void> {
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
        prediction_result VARCHAR(50) DEFAULT 'Pending',
        logic_behind_prediction TEXT,
        predicted_on TIMESTAMP
      );
    `;
    await dbManager.executeQuery('primary', createTableQuery);
  }
}

async function checkIfReportExists(reportId: string): Promise<boolean> {
  const checkQuery = `
    SELECT report_id FROM reports.accident_reports 
    WHERE report_id = $1
  `;
  
  const result = await dbManager.executeQuery('primary', checkQuery, [reportId]);
  return result.rows.length > 0;
}

async function insertReport(record: any): Promise<void> {
  const insertQuery = `
    INSERT INTO reports.accident_reports (
      report_id, report_date, rcf_details, approval_status,
      prediction_result, logic_behind_prediction, predicted_on
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  
  await dbManager.executeQuery('primary', insertQuery, [
    record.uuid,
    record.created,
    JSON.stringify(record.rcf_details),
    record.approval_status,
    "Pending",
    "Pending",
    null
  ]);
  
  console.log(`Record with identifier ${record.uuid} inserted`);
}
