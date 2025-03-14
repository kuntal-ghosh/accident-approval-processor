import { AccidentReport } from '../models';

/**
 * Transforms raw accident reports into properly formatted AccidentReport objects
 * @param records Raw accident records from the data source
 * @returns Array of properly formatted AccidentReport objects
 */
export function transformAccidentReports(records: any[]): AccidentReport[] {
  return records.map(record => {
    // Parse approval_status if it's a string
    let approvalStatus: string[];
    if (typeof record.approval_status === 'string') {
      try {
        approvalStatus = JSON.parse(record.approval_status);
      } catch (e) {
        // If parsing fails, use the string as a single item array
        approvalStatus = [record.approval_status];
      }
    } else if (Array.isArray(record.approval_status)) {
      approvalStatus = record.approval_status;
    } else {
      approvalStatus = [];
    }

    // Check if location sketch exists
    const hasLocationSketch = record.rcf_details && 
      record.rcf_details["LOCATION SKETCH / নকশা/ খসরা চিত্র"] ? true : false;
    
    // Create a copy of rcf_details without the location sketch property
    const rcfDetailsCopy = { ...record.rcf_details };
    if (rcfDetailsCopy["LOCATION SKETCH / নকশা/ খসরা চিত্র"]) {
      delete rcfDetailsCopy["LOCATION SKETCH / নকশা/ খসরা চিত্র"];
    }

    // Return the properly formatted object
    return {
      rcf_details: rcfDetailsCopy,
      approval_status: approvalStatus,
      hasLocationSketch: hasLocationSketch
    };
  });
}
