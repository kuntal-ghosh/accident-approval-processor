/**
 * Transforms API response to camelCase dashboard view model
 * @param {Object} apiData - The raw API response
 * @returns {Object} - Formatted dashboard view model
 */
export function mapToDashboardViewModel(apiData) {
  if (!apiData) {
    return { dashboardData: null };
  }
  
  // Calculate true positives, true negatives, etc. based on your data
  // This is an example - adjust according to your actual data structure
  const truePositives = apiData.latestReports.filter(r => 
    r.prediction_result === "Approved" && r.approval_status === "Approved").length;
  
  const trueNegatives = apiData.latestReports.filter(r => 
    r.prediction_result === "Disapproved" && r.approval_status === "Disapproved").length;
    
  const falsePositives = apiData.latestReports.filter(r => 
    r.prediction_result === "Approved" && r.approval_status === "Disapproved").length;
    
  const falseNegatives = apiData.latestReports.filter(r => 
    r.prediction_result === "Disapproved" && r.approval_status === "Approved").length;
  
  return {
    dashboardData: {
      totalReports: apiData.stats.total_reports,
      predictionResults: apiData.stats.predicted_reports,
      pendingApproval: apiData.stats.pending_reports,
      approved: apiData.stats.approved_reports,
      rejected: apiData.stats.disapproved_reports,
      
      // Map recent activity from latest reports
      recentActivity: apiData.latestReports.map(report => ({
        date: report.predicted_on,
        reportId: report.report_id,
        description: report.prediction_result,
        prediction: report.prediction_result,
        status: report.approval_status,
        isCorrect: report.is_correct
      })),
      
      // Add prediction stats for visualization
      predictionStats: {
        accuracyPercentage: apiData.stats.accuracy_percentage,
        correctPredictions: apiData.stats.correct_predictions,
        incorrectPredictions: apiData.stats.incorrect_predictions,
        truePositives,
        trueNegatives,
        falsePositives,
        falseNegatives
      },
      
      // Example approval rate over time (you'll need to adjust this)
      approvalRateOverTime: [
        { period: 'Jan', rate: 65 },
        { period: 'Feb', rate: 70 },
        { period: 'Mar', rate: 75 },
        { period: 'Apr', rate: 80 },
        { period: 'May', rate: 72 },
        { period: 'Jun', rate: 78 }
      ],
      
      // Active criteria
      activeCriteria: apiData.activeCriteria ? {
        version: apiData.activeCriteria.version,
        createdDate: apiData.activeCriteria.createdAt,
        description: apiData.activeCriteria.description
      } : null
    }
  };
}
