import { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { dbManager } from '../database/connectionManager';
import { criteriaVersionService } from '../services/criteriaVersion.service';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/key';


// Validate required environment variables
// if (!process.env.OPENAI_API_KEY) {
//   console.error('OPENAI_API_KEY not found in environment variables');
//   process.exit(1);
// }

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * Evaluate a single accident report against active criteria
 */
export const evaluateReport = asyncHandler(async (req: Request, res: Response) => {
  const reportId = req.params.reportId;
  
  if (!reportId) {
    throw new AppError('Report ID is required', 400);
  }
  
  // Get report data
  const reportData = await getReportById(reportId);
  
  // Get active criteria
  const activeCriteria = await criteriaVersionService.getActiveCriteria();
  if (!activeCriteria) {
    throw new AppError('No active criteria found for evaluation', 404);
  }
  
  // Evaluate report using AI
  const { decision, reasoning } = await evaluateWithAI(reportData.rcf_details, activeCriteria.criteria);
  
  // Update report with evaluation results
  const updatedReport = await updateReportWithEvaluation(reportId, decision, reasoning);
  
  res.status(200).json({
    status: 'success',
    data: {
      reportId,
      evaluation: {
        result: decision,
        reasoning: reasoning,
        predictedOn: updatedReport.predicted_on,
        criteriaVersion: activeCriteria.version
      },
      updatedReport
    }
  });
});

// Helper functions
async function getReportById(reportId: string) {
  const reportQuery = `
    SELECT * FROM reports.accident_reports 
    WHERE report_id = $1
  `;
  
  const reportResult = await dbManager.executeQuery('primary', reportQuery, [reportId]);
  
  if (reportResult.rows.length === 0) {
    throw new AppError('Report not found', 404);
  }
  
  return reportResult.rows[0];
}

async function evaluateWithAI(reportData: any, criteria: any) {
  try {
    const systemMessage = `You are an expert report evaluator responsible for reviewing accident reports.
Analyze the report data against these specific criteria:

${JSON.stringify(criteria, null, 2)}

Provide a detailed evaluation and conclude with a clear APPROVE or DISAPPROVE decision.`;

    const userMessage = `Here is the report data to evaluate:
${JSON.stringify(reportData, null, 2)}

Please analyze this report against each criterion and make your decision.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
    });
    
    const response = completion.choices[0].message.content || '';
    
    // Extract the decision from the response
    let decision = "Undetermined";
    if (response.includes("APPROVE")) {
      decision = "Approved";
    } else if (response.includes("DISAPPROVE")) {
      decision = "Disapproved";
    }
    
    return { decision, reasoning: response };
  } catch (error) {
    console.error('AI evaluation error:', error);
    throw new AppError(`Failed to evaluate report with AI: ${(error as Error).message}`, 500);
  }
}

async function updateReportWithEvaluation(reportId: string, decision: string, reasoning: string) {
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
    [decision, reasoning, reportId]
  );
  
  return updateResult.rows[0];
}
