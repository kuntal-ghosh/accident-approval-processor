import { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { AccidentCriteriaExtractor } from '../services/criteria-extraction.service';
import { criteriaVersionService } from '../services/criteriaVersion.service';
// import { validateCriteria } from '../validators/criteriaValidator';
import { transformAccidentReports } from '../utils/dataTransformer';
import DatabaseSingleton from '../services/db.singleton';
import {OPENAI_API_KEY} from "../config/key";

//   Extract accident approval criteria from historical reports
 
export const extractCriteria = asyncHandler(async (req: Request, res: Response) => {
  // Validate OpenAI API key
//   if (!process.env.OPENAI_API_KEY) {
//     throw new AppError('OPENAI_API_KEY not found in environment variables', 500);
//   }

  const query = `
    SELECT data->'driverRCFDetails' AS RCF_Details, 
    data->'driverRCFAPPROVE'->> 'APPROVE REPORT?' AS Approval_Status 
    FROM public.grout_record 
    WHERE data ? 'driverRCFAPPROVE' 
        AND data->'driverRCFAPPROVE' IS NOT NULL 
        AND data->'driverRCFAPPROVE' != 'null'::jsonb 
        AND data->'driverRCFAPPROVE' != '[null]'::jsonb;
  `;

  const dbService = await DatabaseSingleton.getInstance();
  const records = await dbService.query(query);
  
  if (records.rows.length === 0) {
    throw new AppError('No accident reports found for criteria extraction', 404);
  }
  
  const formattedRecords = transformAccidentReports(records.rows);
  const criteriaExtractor = new AccidentCriteriaExtractor(OPENAI_API_KEY);
  const criteria = await criteriaExtractor.extractCriteria(formattedRecords);

  // Save criteria to database with versioning
  const description = req.query.description as string || `Criteria extracted on ${new Date().toISOString()}`;
  const savedVersion = await criteriaVersionService.saveCriteriaVersion(criteria, description);

  res.status(200).json({
    status: 'success',
    data: {
      criteria,
      version: savedVersion.version,
      createdAt: savedVersion.createdAt,
      isActive: savedVersion.isActive
    }
  });
});

/**
 * Save new criteria to database
 */
export const saveCriteria = asyncHandler(async (req: Request, res: Response) => {
  const { criteria } = req.body;
  
  // Validate criteria format
// Validate the criteria structure and rules
// const validationError = validateCriteria(criteria);
//   if (validationError) {
//     throw new AppError(`Invalid criteria format: ${validationError}`, 400);
//   }

  const description = req.query.description as string || `Criteria uploaded on ${new Date().toISOString()}`;
  const savedVersion = await criteriaVersionService.saveCriteriaVersion(criteria, description);
  
  res.status(201).json({
    status: 'success',
    data: {
      criteria,
      version: savedVersion.version,
      createdAt: savedVersion.createdAt,
      isActive: savedVersion.isActive
    }
  });
});

/**
 * Get the currently active criteria
 */
export const getActiveCriteria = asyncHandler(async (_req: Request, res: Response) => {
  const activeCriteria = await criteriaVersionService.getActiveCriteria();
  
  if (!activeCriteria) {
    throw new AppError('No active criteria found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: activeCriteria
  });
});

/**
 * Get all criteria versions
 */
export const getAllCriteriaVersions = asyncHandler(async (_req: Request, res: Response) => {
  const versions = await criteriaVersionService.getAllVersions();
  
  res.status(200).json({
    status: 'success',
    data: versions
  });
});
