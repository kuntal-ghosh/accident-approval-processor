import { AccidentReport } from '../models';

/**
 * Transforms raw accident reports into properly formatted AccidentReport objects
 * @param records Raw accident records from the data source
 * @returns Array of properly formatted AccidentReport objects
 */
export function transformAccidentReports(records: any[]): AccidentReport[] {
  return records.map(record => {
        // Parse approval_status if it's a string representation of an array
        let approvalStatusArray = record.approval_status;
    
        // Convert string representation of array to actual array
        if (typeof record.approval_status === 'string') {
          try {
            approvalStatusArray = JSON.parse(record.approval_status);
          } catch (error) {
            // If parsing fails, keep it as is
            console.error(`Failed to parse approval_status: ${record.approval_status}`);
            approvalStatusArray = record.approval_status;
          }
        }
    // Parse approval_status if it's a string
    let approvalStatus: "Approved" | "Disapproved" | "NIL" | "Pending";
     if (Array.isArray(approvalStatusArray) && approvalStatusArray.includes('Approve')) {
      approvalStatus = "Approved";
    }
    else if (Array.isArray(approvalStatusArray) && approvalStatusArray.includes('Not Approve')) {
      approvalStatus = "Disapproved";
    }
    else {
      approvalStatus = "NIL";
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
      uuid: record.uuid, 
      created: record.created,
      rcf_details: rcfDetailsCopy,
      approval_status: approvalStatus,
      hasLocationSketch: hasLocationSketch
    };
  });
}
